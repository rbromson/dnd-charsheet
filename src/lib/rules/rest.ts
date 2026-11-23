import type { Character } from '../model/types';
import { regainCharges } from './powers';

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
    const regain = Math.max(1, Math.floor(c.hitDice.total / 2));
    c.hitDice.used = Math.max(0, c.hitDice.used - regain);
    c.deathSaves = { success: 0, fail: 0 };
    for (const s of c.spellcasting.slots) s.used = 0;
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
    const regain = Math.max(1, Math.floor(c.hitDice.total / 2));
    const left = c.hitDice.total - c.hitDice.used;
    const after = c.hitDice.total - Math.max(0, c.hitDice.used - regain);
    if (after !== left) out.push(['hitDice', `${left} → ${after}`]);
    const usedSlots = c.spellcasting.slots.reduce((s, x) => s + x.used, 0);
    if (usedSlots > 0) out.push(['slots', `−${usedSlots} → 0`]);
  }
  return out;
}
