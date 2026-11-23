/**
 * Стани (SRD 5.1), виснаження й концентрація: що вони роблять з кидками і швидкістю.
 * Автоматично — лише те, що однозначно: перешкода/перевага в окні кидка, швидкість 0 чи вдвічі менша.
 * Решта (умови «поки бачиш джерело», межі ОЗ) — підказкою.
 */
import type { Ability, Character } from '../model/types';
import type { CheckKind } from '../stores/dice.svelte';

export const CONDITIONS = [
  'blinded',
  'charmed',
  'deafened',
  'frightened',
  'grappled',
  'incapacitated',
  'invisible',
  'paralyzed',
  'petrified',
  'poisoned',
  'prone',
  'restrained',
  'stunned',
  'unconscious',
] as const;
export type Condition = (typeof CONDITIONS)[number];

/** Стани, що містять «недієздатний» (і обривають концентрацію). */
const INCAP: Condition[] = ['incapacitated', 'paralyzed', 'petrified', 'stunned', 'unconscious'];

export const has = (c: Character, k: Condition) => (c.conditions ?? []).includes(k);
export const incapacitated = (c: Character) => INCAP.some((k) => has(c, k));

/** Чому цей кидок з перевагою/перешкодою — ключі для підпису («poisoned», «exhaustion»). */
export interface RollFx {
  adv: string[];
  dis: string[];
  /** рятунки Сили/Спритності автоматично провалені (паралізований, приголомшений…) */
  autoFail: string[];
}

export function rollEffects(c: Character, kind: CheckKind, ability?: Ability | null): RollFx {
  const fx: RollFx = { adv: [], dis: [], autoFail: [] };
  const ex = c.exhaustion ?? 0;
  const check = kind === 'skill' || kind === 'ability' || kind === 'init';
  if (kind === 'attack') {
    for (const k of ['blinded', 'frightened', 'poisoned', 'prone', 'restrained'] as const) if (has(c, k)) fx.dis.push(k);
    if (ex >= 3) fx.dis.push('exhaustion');
    if (has(c, 'invisible')) fx.adv.push('invisible');
  }
  if (check) {
    for (const k of ['frightened', 'poisoned'] as const) if (has(c, k)) fx.dis.push(k);
    if (ex >= 1) fx.dis.push('exhaustion');
  }
  if (kind === 'save') {
    if (ex >= 3) fx.dis.push('exhaustion');
    if (ability === 'dex' && has(c, 'restrained')) fx.dis.push('restrained');
    if (ability === 'str' || ability === 'dex') for (const k of ['paralyzed', 'petrified', 'stunned', 'unconscious'] as const) if (has(c, k)) fx.autoFail.push(k);
  }
  return fx;
}

/** Підсумковий режим: перевага й перешкода разом скасовуються. */
export function autoMode(fx: RollFx): 'adv' | 'dis' | 'normal' {
  if (fx.adv.length && !fx.dis.length) return 'adv';
  if (fx.dis.length && !fx.adv.length) return 'dis';
  return 'normal';
}

/** Швидкість після станів і виснаження: 0 — схоплений/скутий/виснаження 5; вдвічі — виснаження 2. */
export function speedAfter(c: Character, v: number): { v: number; why: string[] } {
  const why: string[] = [];
  const ex = c.exhaustion ?? 0;
  for (const k of ['grappled', 'restrained', 'paralyzed', 'petrified', 'stunned', 'unconscious'] as const)
    if (has(c, k)) {
      why.push(k);
      return { v: 0, why };
    }
  if (ex >= 5) return { v: 0, why: ['exhaustion'] };
  if (ex >= 2) return { v: Math.floor(v / 2), why: ['exhaustion'] };
  return { v, why };
}

/** СК рятунку концентрації після шкоди: 10 або половина шкоди. */
export const concentrationDc = (damage: number): number => Math.max(10, Math.floor(damage / 2));
