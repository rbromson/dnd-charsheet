import { rollD20, addDie, type D20Roll, type RollMode } from '../dice/d20';
import { rollFormula, type FormulaRoll } from '../dice/formula';
import { cryptoRng } from '../dice/rng';
import { uid } from '../model/ids';
import { charStore } from './characters.svelte';
import { buzz } from './ui.svelte';

export type CheckKind = 'skill' | 'save' | 'attack' | 'init' | 'death' | 'ability' | 'free';

export interface CheckRequest {
  label: string;
  bonus: number;
  kind: CheckKind;
  minD20?: number | null;
  /** для атаки — чтобы предложить бросок урона */
  attackId?: string;
  /** формула урона, уже с подставленным МОД (для атаки) */
  damage?: string;
  damageLabel?: string;
  /** доп. урон на выбор (проти драконів) и на критичному — отметки у окна броска */
  extras?: { id: string; label: string; dice: string; crit: boolean }[];
}

export type RollEntry =
  | { id: string; at: number; type: 'd20'; label: string; request: CheckRequest; roll: D20Roll; spent: Record<string, number> }
  | { id: string; at: number; type: 'formula'; label: string; roll: FormulaRoll; /** без «Ще раз» (кубик здоров'я) */ once?: boolean };

/** История бросков переживает перезагрузку (последние 40, только на этом устройстве). */
const HIST_KEY = 'taverna.diceHistory';
function loadHistory(): RollEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(HIST_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((e) => e && typeof e.id === 'string' && (e.type === 'd20' || e.type === 'formula') && e.roll).slice(0, 40) : [];
  } catch {
    return [];
  }
}
function saveHistory(h: RollEntry[]) {
  try {
    localStorage.setItem(HIST_KEY, JSON.stringify(h));
  } catch {
    /* приватный режим / нет места */
  }
}

class DiceStore {
  /** Режим следующего броска d20; сбрасывается после броска */
  mode = $state<RollMode>('normal');
  last = $state<RollEntry | null>(null);
  history = $state<RollEntry[]>(loadHistory());
  overlayOpen = $state(false);
  /** увеличивается на каждый бросок — для перезапуска анимации */
  seq = $state(0);
  /** seq броска, чья анимация уже закончилась (кость приземлилась) — чтобы применять результат без спойлеров */
  landed = $state(0);
  #waiters: { seq: number; fn: () => void }[] = [];

  /** Кость броска seq приземлилась: применить отложенные результаты (лечение, риск последнего заряда). */
  markLanded(seq: number) {
    if (seq > this.landed) this.landed = seq;
    const ready = this.#waiters.filter((w) => w.seq <= this.landed);
    this.#waiters = this.#waiters.filter((w) => w.seq > this.landed);
    for (const w of ready) w.fn();
  }

  /** Выполнить fn, когда приземлится бросок seq (сразу, если уже). */
  whenLanded(seq: number, fn: () => void) {
    if (this.landed >= seq) fn();
    else this.#waiters.push({ seq, fn });
  }
  /**
   * Бросок, который ждёт подтверждения: тап по стату открывает «подготовку» —
   * там выбирается перевага/перешкода, и кость бросается вторым нажатием.
   */
  pending = $state<{ req: CheckRequest; after?: (e: RollEntry) => void } | null>(null);

  /** Подготовить бросок d20 (с листа персонажа): режим сбрасывается в «звичайний». */
  askCheck(req: CheckRequest, after?: (e: RollEntry) => void) {
    this.mode = 'normal';
    this.overlayOpen = false;
    this.pending = { req, after };
    buzz(8);
  }

  /** Бросить подготовленный бросок с выбранным режимом. */
  confirmPending(): RollEntry | null {
    const p = this.pending;
    if (!p) return null;
    this.pending = null;
    const e = this.rollCheck(p.req);
    p.after?.(e);
    return e;
  }

  cancelPending() {
    this.pending = null;
    this.mode = 'normal';
  }

  #push(e: RollEntry) {
    this.last = e;
    this.history = [e, ...this.history].slice(0, 40);
    saveHistory(this.history);
    this.seq++;
    this.overlayOpen = true;
  }

  rollCheck(req: CheckRequest): RollEntry {
    const c = charStore.current;
    const roll = rollD20({
      bonus: req.bonus,
      mode: this.mode,
      minD20: req.minD20 ?? null,
      rerollOnes: c?.rules.rerollOnes ?? false,
      rng: cryptoRng,
    });
    this.mode = 'normal';
    const e: RollEntry = { id: uid(), at: Date.now(), type: 'd20', label: req.label, request: req, roll, spent: {} };
    this.#push(e);
    buzz(roll.crit ? [30, 40, 60] : roll.fumble ? [80] : 20);
    return e;
  }

  rollDamage(label: string, formula: string, crit = false, once = false): RollEntry {
    const roll = rollFormula(formula, { rng: cryptoRng, crit });
    const e: RollEntry = { id: uid(), at: Date.now(), type: 'formula', label, roll, ...(once ? { once } : {}) };
    this.#push(e);
    buzz(20);
    return e;
  }

  /** Свободный бросок из лотка: «2d20», «3d6+1». */
  rollFree(formula: string, label = formula): RollEntry {
    return this.rollDamage(label, formula, false);
  }

  /** Сколько единиц ресурса уже докинуто в последний бросок. */
  spentOnLast(resourceId: string): number {
    return this.last?.type === 'd20' ? (this.last.spent[resourceId] ?? 0) : 0;
  }

  canAddResourceDie(resourceId: string): boolean {
    const c = charStore.current;
    const r = c?.resources.find((x) => x.id === resourceId);
    if (!r || !r.die || r.current <= 0 || this.last?.type !== 'd20') return false;
    return r.maxPerRoll == null || this.spentOnLast(resourceId) < r.maxPerRoll;
  }

  /** Докинуть кость ресурса к последнему броску d20 и списать единицу. */
  addResourceDie(resourceId: string): boolean {
    if (!this.canAddResourceDie(resourceId)) return false;
    const last = this.last;
    if (last?.type !== 'd20') return false;
    const r = charStore.current!.resources.find((x) => x.id === resourceId)!;
    const sides = parseInt(r.die!.replace(/[^\d]/g, ''), 10) || 4;
    charStore.update((c) => {
      const rr = c.resources.find((x) => x.id === resourceId);
      if (rr) rr.current = Math.max(0, rr.current - 1);
    });
    const roll = addDie(last.roll, sides, r.name, cryptoRng);
    const updated: RollEntry = { ...last, roll, spent: { ...last.spent, [resourceId]: (last.spent[resourceId] ?? 0) + 1 } };
    this.last = updated;
    this.history = this.history.map((h) => (h.id === updated.id ? updated : h));
    saveHistory(this.history);
    this.seq++;
    buzz(15);
    return true;
  }

  /** Спасбросок от смерти: 1 — два провала, 20 — 1 хит и сброс, ≥10 — успех. Сразу бросок (без окна выбора), итог — когда кость приземлится. */
  rollDeathSave(label: string) {
    this.mode = 'normal';
    const e = this.rollCheck({ label, bonus: 0, kind: 'death' });
    this.whenLanded(this.seq, () => this.applyDeathSave(e, label));
  }

  applyDeathSave(e: RollEntry, label: string) {
    if (e.type !== 'd20') return;
    const nat = e.roll.natural;
    charStore.update(
      (c) => {
        if (nat === 20) {
          c.hp.current = Math.max(c.hp.current, 1);
          c.deathSaves = { success: 0, fail: 0 };
        } else if (nat === 1) c.deathSaves.fail = Math.min(3, c.deathSaves.fail + 2);
        else if (e.roll.total >= 10) c.deathSaves.success = Math.min(3, c.deathSaves.success + 1);
        else c.deathSaves.fail = Math.min(3, c.deathSaves.fail + 1);
      },
      { undo: label },
    );
  }

  close() {
    this.overlayOpen = false;
  }
}

export const dice = new DiceStore();
