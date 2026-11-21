/** Части строки «Розрахунок» — словами, откуда взялось число. Сами формулы — только в rules/calc. */
import type { Ability, Attack, Character, SkillKey } from '../../lib/model/types';
import { itemActive, mod, profBonus, skillBonus } from '../../lib/rules/calc';
import { t } from '../../lib/i18n';

export interface CalcPart {
  label: string;
  value: number;
  /** false — без знака (например, база 10) */
  signed?: boolean;
  suffix?: string;
}

const short = (a: Ability) => t(`abilityShort.${a}`);

function extra(bonus: number): CalcPart[] {
  return bonus ? [{ label: t('sheet.calc.extra'), value: bonus }] : [];
}

export function skillParts(c: Character, key: SkillKey): CalcPart[] {
  const s = c.skills[key];
  const out: CalcPart[] = [{ label: short(s.ability), value: mod(c, s.ability) }];
  if (s.prof > 0) out.push({ label: t('sheet.calc.prof'), value: profBonus(c), suffix: s.prof === 2 ? t('sheet.calc.expertise') : undefined });
  return [...out, ...extra(s.bonus)];
}

export function saveParts(c: Character, a: Ability): CalcPart[] {
  const s = c.saves[a];
  const out: CalcPart[] = [{ label: short(a), value: mod(c, a) }];
  if (s.prof) out.push({ label: t('sheet.calc.prof'), value: profBonus(c) });
  for (const i of c.equipment) if (i.saveBonus && itemActive(i)) out.push({ label: i.name, value: i.saveBonus });
  return [...out, ...extra(s.bonus)];
}

export function initParts(c: Character): CalcPart[] {
  return [{ label: short('dex'), value: mod(c, 'dex') }, ...extra(c.initiative.bonus)];
}

export function passiveParts(c: Character): CalcPart[] {
  return [
    { label: t('sheet.calc.base'), value: 10, signed: false },
    { label: t('skill.perception'), value: skillBonus(c, 'perception') },
    ...extra(c.passivePerception.bonus),
  ];
}

export function attackParts(c: Character, atk: Attack): CalcPart[] {
  const out: CalcPart[] = [];
  if (atk.ability) out.push({ label: short(atk.ability), value: mod(c, atk.ability) });
  if (atk.prof) out.push({ label: t('sheet.calc.prof'), value: profBonus(c) });
  out.push(...extra(atk.bonus));
  if (!out.length) out.push({ label: t('sheet.calc.base'), value: 0 });
  return out;
}
