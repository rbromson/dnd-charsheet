import type { Ability, Attack, Character, Item, SkillKey } from '../model/types';

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

export const profBonusForLevel = (level: number): number => 2 + Math.floor((Math.min(Math.max(level, 1), 20) - 1) / 4);

export const profBonus = (c: Character): number => c.profBonusOverride ?? profBonusForLevel(c.level);

/** Предмет действует: надет и, если требует, налаштований. */
export const itemActive = (i: Item): boolean => i.equipped && (!i.attune || i.attuned);

/** Предмет, который сейчас задаёт значение характеристики («твоя Сила дорівнює 19»), если он выше своего. */
export function abilitySetBy(c: Character, a: Ability): Item | null {
  let best: Item | null = null;
  for (const i of c.equipment)
    if (i.setAbility === a && itemActive(i) && i.setValue > c.abilities[a] && (!best || i.setValue > best.setValue)) best = i;
  return best;
}
/** Значение характеристики с учётом предметов. */
export const abilityScore = (c: Character, a: Ability): number => abilitySetBy(c, a)?.setValue ?? c.abilities[a];

export const mod = (c: Character, a: Ability): number => abilityMod(abilityScore(c, a));

/** Сумма бонусов к рятункам от действующих предметов. */
export const itemSaveBonus = (c: Character): number => c.equipment.reduce((s, i) => s + (itemActive(i) ? i.saveBonus : 0), 0);

export const attunedCount = (c: Character): number => c.equipment.filter((i) => i.attune && i.attuned).length;

export interface AcPart {
  label: string;
  value: number;
}
/** КО от надетого снаряжения: доспех (или 10) + Вправність с пределом + щит + бонусы предметов. */
export function acFromGear(c: Character): { total: number; parts: AcPart[] } {
  const dex = mod(c, 'dex');
  const worn = c.equipment.filter((i) => i.armor && itemActive(i));
  const armorVal = (i: Item) => {
    const a = i.armor!;
    const d = a.dexMax === null ? dex : Math.min(dex, a.dexMax);
    return a.base + d + i.bonus;
  };
  const body = worn.filter((i) => i.armor!.kind !== 'shield').sort((x, y) => armorVal(y) - armorVal(x))[0];
  const shield = worn.filter((i) => i.armor!.kind === 'shield').sort((x, y) => y.armor!.base + y.bonus - (x.armor!.base + x.bonus))[0];
  const parts: AcPart[] = [];
  if (body) {
    const a = body.armor!;
    parts.push({ label: body.name, value: a.base });
    const d = a.dexMax === null ? dex : Math.min(dex, a.dexMax);
    if (a.dexMax !== 0) parts.push({ label: a.dexMax === null ? 'Вправність' : `Вправність (макс. ${a.dexMax})`, value: d });
    if (body.bonus) parts.push({ label: `${body.name}: магія`, value: body.bonus });
  } else {
    parts.push({ label: 'Без обладунку', value: 10 });
    parts.push({ label: 'Вправність', value: dex });
  }
  if (shield) parts.push({ label: shield.name, value: shield.armor!.base + shield.bonus });
  for (const i of c.equipment) {
    if (!i.acBonus || !itemActive(i) || i.armor) continue;
    if (i.noArmor && (body || shield)) continue;
    parts.push({ label: i.name, value: i.acBonus });
  }
  return { total: parts.reduce((s, p) => s + p.value, 0), parts };
}

/** Бонусы к КО от действующих не-доспехов (плащ, перстень захисту…) — добавляются и к ручному КО. */
export function itemAcBonusParts(c: Character): AcPart[] {
  const wearingArmor = c.equipment.some((i) => i.armor && itemActive(i));
  return c.equipment
    .filter((i) => i.acBonus && itemActive(i) && !i.armor && !(i.noArmor && wearingArmor))
    .map((i) => ({ label: i.name, value: i.acBonus }));
}

/** Итоговый КО: от снаряжения или вручную (+ бонусы предметов). */
export const armorClass = (c: Character): number =>
  c.acAuto ? acFromGear(c).total : c.ac + itemAcBonusParts(c).reduce((s, p) => s + p.value, 0);

export function skillAuto(c: Character, key: SkillKey): number {
  const s = c.skills[key];
  return mod(c, s.ability) + s.prof * profBonus(c) + s.bonus;
}
export function skillBonus(c: Character, key: SkillKey): number {
  return c.skills[key].override ?? skillAuto(c, key);
}

export function saveAuto(c: Character, a: Ability): number {
  const s = c.saves[a];
  return mod(c, a) + s.prof * profBonus(c) + s.bonus + itemSaveBonus(c);
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

/** СК рятунку для атак-«рятунків»: 8 + бонус майстерності + модифікатор характеристики атаки. */
export const attackSaveDc = (c: Character, atk: Attack): number =>
  atk.saveDc ?? 8 + profBonus(c) + (atk.ability ? mod(c, atk.ability) : 0);

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
