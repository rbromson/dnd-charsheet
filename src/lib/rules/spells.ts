/** Каст заклинання з картки: комірка, концентрація, ефект на себе. Мутує персонажа (у charStore.update). */
import type { Character, ItemMod } from '../model/types';
import { uid } from '../model/ids';
import { endConcentration } from './conditions';

export interface CastPlan {
  name: string;
  /** коло комірки; 0 — замовляння, без комірки */
  slot: number;
  conc: boolean;
  /** ефект на себе (null — не накладати) */
  fx: { mods: ItemMod[]; duration: string } | null;
}

/** Скільки вільних комірок цього кола. */
export const slotsLeft = (c: Character, lvl: number): number => {
  const s = c.spellcasting.slots[lvl];
  return s ? Math.max(0, s.total - s.used) : 0;
};

export function castSpell(c: Character, p: CastPlan): boolean {
  if (p.slot > 0) {
    if (slotsLeft(c, p.slot) <= 0) return false;
    c.spellcasting.slots[p.slot].used += 1;
  }
  // нове заклинання на концентрації обриває попереднє (з його ефектами)
  if (p.conc) {
    endConcentration(c);
    c.concentration = p.name;
  }
  if (p.fx && p.fx.mods.length) c.effects.push({ id: uid(), name: p.name, source: p.name, mods: p.fx.mods, duration: p.fx.duration, conc: p.conc });
  return true;
}
