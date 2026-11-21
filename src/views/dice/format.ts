/** Чистые помощники для отображения бросков (без строк интерфейса — подписи передаются параметром). */
import type { D20Roll } from '../../lib/dice/d20';
import type { FormulaRoll } from '../../lib/dice/formula';
import type { RollEntry } from '../../lib/stores/dice.svelte';

export const MINUS = '−';

/** Кости лотка в порядке показа. */
export const TRAY_DICE = [4, 6, 8, 10, 12, 20, 100] as const;

export interface Part {
  label: string;
  value: number;
}

/** «d20 8 + бонус 4 − d4 2 = 10» — знак берётся из value; нулевые слагаемые (кроме первого) опускаются. */
export function joinParts(parts: Part[], total: number): string {
  let s = '';
  parts.forEach((p, i) => {
    if (i > 0 && p.value === 0) return;
    const body = `${p.label ? p.label + ' ' : ''}${Math.abs(p.value)}`;
    if (i === 0 && s === '') s = p.value < 0 ? `${MINUS}${body}` : body;
    else s += ` ${p.value < 0 ? MINUS : '+'} ${body}`;
  });
  return `${s} = ${total < 0 ? MINUS + Math.abs(total) : total}`;
}

export function d20Parts(roll: D20Roll, bonusLabel: string): Part[] {
  const kept = roll.dice.find((d) => d.kept) ?? roll.dice[0];
  const parts: Part[] = [{ label: 'd20', value: kept.value }];
  if (roll.bonus) parts.push({ label: bonusLabel, value: roll.bonus });
  for (const x of roll.extra) parts.push({ label: `d${x.sides}`, value: x.value });
  return parts;
}

export function formulaParts(roll: FormulaRoll): Part[] {
  const parts: Part[] = roll.dice.map((d) => ({ label: `d${d.sides}`, value: d.sign * d.value }));
  if (roll.flat) parts.push({ label: '', value: roll.flat });
  return parts;
}

export type RuleChip =
  | { kind: 'reroll'; from: number; to: number; kept: boolean }
  | { kind: 'min'; from: number; to: number; kept: boolean }
  | { kind: 'extra'; sides: number; label: string; value: number; kept: true };

/** Какие домашние правила сработали: переброс единицы, минимум на d20, докинутые кости ресурсов. */
export function ruleChips(roll: D20Roll): RuleChip[] {
  const out: RuleChip[] = [];
  const ordered = [...roll.dice].sort((a, b) => Number(b.kept) - Number(a.kept));
  for (const d of ordered) {
    if (d.rerolledFrom != null) out.push({ kind: 'reroll', from: d.rerolledFrom, to: d.face, kept: d.kept });
    if (d.value !== d.face) out.push({ kind: 'min', from: d.face, to: d.value, kept: d.kept });
  }
  for (const x of roll.extra) out.push({ kind: 'extra', sides: x.sides, label: x.label, value: x.value, kept: true });
  return out;
}

export interface DieGroup {
  sides: number;
  sign: 1 | -1;
  values: number[];
}

/** Подряд идущие кости одного типа и знака — в одну группу (порядок формулы сохраняется). */
export function groupDice(roll: FormulaRoll): DieGroup[] {
  const out: DieGroup[] = [];
  for (const d of roll.dice) {
    const g = out[out.length - 1];
    if (g && g.sides === d.sides && g.sign === d.sign) g.values.push(d.value);
    else out.push({ sides: d.sides, sign: d.sign, values: [d.value] });
  }
  return out;
}

/** Значение для чипа истории: несколько d20 без модификатора — все грани («7, 16»), иначе итог. */
export function historyValue(e: RollEntry): string {
  if (e.type === 'formula') {
    const r = e.roll;
    if (r.dice.length > 1 && r.flat === 0 && r.dice.every((d) => d.sides === 20 && d.sign > 0)) {
      return r.dice.map((d) => d.value).join(', ');
    }
  }
  const t = e.roll.total;
  return t < 0 ? MINUS + Math.abs(t) : String(t);
}

/** Формула лотка: «2d20+1», «1d6+1d8−2». Пусто — 1d20. */
export function trayFormula(counts: Partial<Record<number, number>>, mod: number): string {
  let s = TRAY_DICE.filter((d) => (counts[d] ?? 0) > 0)
    .map((d) => `${counts[d]}d${d}`)
    .join('+');
  if (!s) s = '1d20';
  if (mod) s += (mod > 0 ? '+' : MINUS) + Math.abs(mod);
  return s;
}

/** Та же формула в виде, который понимает parseFormula (ASCII минус). */
export function trayFormulaAscii(counts: Partial<Record<number, number>>, mod: number): string {
  return trayFormula(counts, mod).replaceAll(MINUS, '-');
}

/** Ровно один d20 и больше ничего — такой бросок идёт как проверка d20 (перевага/перешкода, крит). */
export function isSingleD20(counts: Partial<Record<number, number>>): boolean {
  const total = TRAY_DICE.reduce((s, d) => s + (counts[d] ?? 0), 0);
  return total === 0 || (total === 1 && (counts[20] ?? 0) === 1);
}
