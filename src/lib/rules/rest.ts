import type { Character } from '../model/types';
import { regainCharges } from './powers';
import { hitDiceLeft, hitDiceTotal, regainHitDice } from './hitdice';

export type RestKind = 'short' | 'long';

/**
 * Мутирует персонажа (вызывать внутри charStore.update).
 * Возвращает броски восстановления зарядов «на світанку» (жезли: 1к6+1) — для подсказки.
 */
export function applyRest(c: Character, kind: RestKind): { name: string; regain: string; got: number }[] {
  const rolls: { name: string; regain: string; got: number }[] = [];
  for (const r of c.resources) {
    if (kind === 'long' && r.recharge === 'long' && r.regain) {
      if (r.current < r.max) rolls.push({ name: r.name, regain: r.regain, got: regainCharges(r) });
    } else if (r.recharge === 'short' || (kind === 'long' && r.recharge === 'long')) r.current = r.max;
  }
  if (kind === 'long') {
    c.hp.current = c.hp.max;
    c.hp.temp = 0;
    regainHitDice(c);
    c.deathSaves = { success: 0, fail: 0 };
    for (const s of c.spellcasting.slots) s.used = 0;
    // 8 годин минули: дія зілль закінчилась, перемикачі (чоботи, крила, клинок) вимкнені
    c.effects = [];
    for (const it of c.equipment) for (const tg of it.toggles ?? []) tg.on = false;
    // 8 годин сну: виснаження −1, концентрація скінчилась
    if (c.exhaustion > 0) c.exhaustion -= 1;
    c.concentration = null;
    // світанок: «раз на день» знову доступне (ріг Валгалли «раз на 7 днів» — вручну)
    for (const it of c.equipment) for (const p of it.powers) if (p.uses && p.uses.days === 1) p.uses.used = 0;
  }
  return rolls;
}

/** Что изменится — для подтверждения. Возвращает пары [название, «было → станет»]. */
export function restPreview(c: Character, kind: RestKind): [string, string][] {
  const out: [string, string][] = [];
  for (const r of c.resources) {
    const restores = r.recharge === 'short' || (kind === 'long' && r.recharge === 'long');
    if (restores && r.current < r.max) out.push([r.name, kind === 'long' && r.regain ? `${r.current} → +${r.regain}` : `${r.current} → ${r.max}`]);
  }
  if (kind === 'long') {
    if (c.hp.current < c.hp.max) out.push(['hp', `${c.hp.current} → ${c.hp.max}`]);
    if (c.hp.temp > 0) out.push(['temp', `${c.hp.temp} → 0`]);
    const left = hitDiceLeft(c);
    const after = Math.min(hitDiceTotal(c), left + Math.max(1, Math.floor(hitDiceTotal(c) / 2)));
    if (after !== left) out.push(['hitDice', `${left} → ${after}`]);
    const usedSlots = c.spellcasting.slots.reduce((s, x) => s + x.used, 0);
    if (usedSlots > 0) out.push(['slots', `−${usedSlots} → 0`]);
    if (c.effects?.length) out.push(['effects', String(c.effects.length)]);
    const daily = c.equipment.flatMap((it) => it.powers.filter((p) => p.uses && p.uses.days === 1 && p.uses.used > 0));
    if (daily.length) out.push(['daily', String(daily.length)]);
    if (c.exhaustion > 0) out.push(['exhaustion', `${c.exhaustion} → ${c.exhaustion - 1}`]);
  }
  return out;
}
