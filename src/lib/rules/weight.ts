/** Вага й вантажопідйомність (SRD): Сила × 15 фунтів; 50 монет важать 1 фунт. */
import type { Character } from '../model/types';
import { abilityScore } from './calc';

export const coinsWeight = (c: Character): number => {
  const n = Object.values(c.coins ?? {}).reduce((s: number, v) => s + (typeof v === 'number' ? v : 0), 0);
  return n / 50;
};
export const itemsWeight = (c: Character): number => c.equipment.reduce((s, i) => s + Math.max(0, i.qty) * Math.max(0, i.weight ?? 0), 0);
export const carried = (c: Character): number => Math.round((itemsWeight(c) + coinsWeight(c)) * 10) / 10;
export const capacity = (c: Character): number => abilityScore(c, 'str') * 15;
