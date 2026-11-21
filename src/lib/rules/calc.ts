import type { Ability, Attack, Character, SkillKey } from '../model/types';

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

export const profBonusForLevel = (level: number): number => 2 + Math.floor((Math.min(Math.max(level, 1), 20) - 1) / 4);

export const profBonus = (c: Character): number => c.profBonusOverride ?? profBonusForLevel(c.level);

export const mod = (c: Character, a: Ability): number => abilityMod(c.abilities[a]);

export function skillAuto(c: Character, key: SkillKey): number {
  const s = c.skills[key];
  return mod(c, s.ability) + s.prof * profBonus(c) + s.bonus;
}
export function skillBonus(c: Character, key: SkillKey): number {
  return c.skills[key].override ?? skillAuto(c, key);
}

export function saveAuto(c: Character, a: Ability): number {
  const s = c.saves[a];
  return mod(c, a) + s.prof * profBonus(c) + s.bonus;
}
export function saveBonus(c: Character, a: Ability): number {
  return c.saves[a].override ?? saveAuto(c, a);
}

export const initiativeAuto = (c: Character): number => mod(c, 'dex') + c.initiative.bonus;
export const initiative = (c: Character): number => c.initiative.override ?? initiativeAuto(c);

export const passivePerceptionAuto = (c: Character): number => 10 + skillBonus(c, 'perception') + c.passivePerception.bonus;
export const passivePerception = (c: Character): number => c.passivePerception.override ?? passivePerceptionAuto(c);

export function attackAuto(c: Character, atk: Attack): number {
  return (atk.ability ? mod(c, atk.ability) : 0) + (atk.prof ? profBonus(c) : 0) + atk.bonus;
}
export const attackBonus = (c: Character, atk: Attack): number => atk.override ?? attackAuto(c, atk);

/** Подставляет модификатор характеристики атаки вместо МОД/MOD и нормализует запись. */
export function resolveDamageFormula(c: Character, atk: Attack): string {
  const m = atk.ability ? mod(c, atk.ability) : 0;
  let f = atk.damage.replace(/\s+/g, '').replace(/(МОД|Мод|мод|MOD|Mod|mod)/g, String(m));
  f = f.replace(/[дД]/g, 'd');
  return f.replace(/\+-/g, '-').replace(/-\+/g, '-').replace(/--/g, '+').replace(/\+0(?!\d)/g, '');
}

export const spellDCAuto = (c: Character): number => 8 + profBonus(c) + mod(c, c.spellcasting.ability);
export const spellDC = (c: Character): number => c.spellcasting.dcOverride ?? spellDCAuto(c);
export const spellAttackAuto = (c: Character): number => profBonus(c) + mod(c, c.spellcasting.ability);
export const spellAttack = (c: Character): number => c.spellcasting.attackOverride ?? spellAttackAuto(c);

export const fmt = (n: number): string => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
