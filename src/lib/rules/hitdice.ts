/**
 * Кубики здоров'я, у тому числі мультиклас: основний пул (c.hitDice) + додаткові (c.hitDiceMore).
 * Довгий відпочинок повертає половину загальної кількості — спершу найбільші кубики.
 */
import type { Character } from '../model/types';

export interface Pool {
  /** 'main' — основний пул */
  id: string;
  die: string;
  total: number;
  used: number;
}

const sides = (die: string) => parseInt(die.replace(/[^\d]/g, ''), 10) || 8;

export function pools(c: Character): Pool[] {
  return [{ id: 'main', ...c.hitDice }, ...(c.hitDiceMore ?? [])].filter((p) => p.id === 'main' || p.total > 0);
}

function poolRef(c: Character, id: string): { die: string; total: number; used: number } | undefined {
  return id === 'main' ? c.hitDice : c.hitDiceMore?.find((p) => p.id === id);
}

export const hitDiceLeft = (c: Character): number => pools(c).reduce((s, p) => s + Math.max(0, p.total - p.used), 0);
export const hitDiceTotal = (c: Character): number => pools(c).reduce((s, p) => s + p.total, 0);

/** Витратити один кубик пулу (false — у пулі не лишилось). */
export function spendHitDie(c: Character, id: string): boolean {
  const p = poolRef(c, id);
  if (!p || p.used >= p.total) return false;
  p.used += 1;
  return true;
}

/** Довгий відпочинок: повернути половину (мін. 1) загальної кількості, найбільші кубики першими. */
export function regainHitDice(c: Character): number {
  let left = Math.max(1, Math.floor(hitDiceTotal(c) / 2));
  let got = 0;
  const order = pools(c).sort((a, b) => sides(b.die) - sides(a.die));
  for (const o of order) {
    const p = poolRef(c, o.id)!;
    const back = Math.min(p.used, left);
    p.used -= back;
    left -= back;
    got += back;
    if (left <= 0) break;
  }
  return got;
}

/** Підвищення рівня: +1 кубик у пул класу, що отримав рівень. */
export function addHitDie(c: Character, id: string): void {
  const p = poolRef(c, id);
  if (p) p.total += 1;
}

/** Середнє значення кубика здоров'я (округлено вгору, як у PHB): d6 → 4, d8 → 5, d10 → 6, d12 → 7. */
export const averageHp = (die: string): number => Math.floor(sides(die) / 2) + 1;
