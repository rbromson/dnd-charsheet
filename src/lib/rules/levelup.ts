/** Підвищення рівня: +1 рівень, ОЗ (середнє чи кидок + Статура), +1 кубик здоров'я, поріг досвіду за таблицею. */
import type { Character } from '../model/types';
import { xpForNextLevel } from '../model/defaults';
import { addHitDie } from './hitdice';
import { mod } from './calc';

export function levelUp(c: Character, pool: string, roll: number): { level: number; hp: number } {
  const from = c.level;
  const gain = Math.max(1, roll + mod(c, 'con'));
  c.level = Math.min(20, from + 1);
  c.hp.max += gain;
  c.hp.current += gain;
  addHitDie(c, pool);
  // «Досвід до рівня» за таблицею, якщо його не змінювали вручну
  if (c.xpNext === xpForNextLevel(from) || c.xpNext === 300 || c.xpNext === 0) c.xpNext = xpForNextLevel(c.level);
  return { level: c.level, hp: gain };
}
