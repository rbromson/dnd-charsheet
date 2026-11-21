/** Превращение записей библиотеки в предметы, атаки, ресурсы и заклинания персонажа. */
import type { Attack, Character, Item, Spell, WeaponStats, ArmorStats } from '../model/types';
import { newItem } from '../model/defaults';
import { uid } from '../model/ids';
import { addWeaponAttack } from '../rules/weapons';
import type { LibItem, LibSpell, LibWeapon, LibArmor } from './types';

const GENERIC_PLUS = new Set(['m:weapon', 'm:armor', 'm:ammunition']);

export const weaponFromLib = (w: LibWeapon): WeaponStats => ({
  dice: w.d,
  type: w.dt,
  props: [...w.p],
  finesse: w.f,
  ranged: w.rg,
  versatile: w.v ?? '',
  range: w.rn ?? '',
  martial: w.m,
});
export const armorFromLib = (a: LibArmor): ArmorStats => ({
  kind: a.k,
  base: a.b,
  dexMax: a.dx === undefined ? null : a.dx,
  strMin: a.s ?? 0,
  stealthDis: !!a.sd,
});

/** Подходит ли обычный предмет как основа для «Зброя +1», «Вогняний язик (будь-який меч)» и т. п. */
export function fitsPick(pick: string, base: LibItem): boolean {
  const [kind, what] = pick.split(':');
  if (kind === 'w') {
    if (base.c !== 'weapon' || !base.w) return what === 'ammo' && base.c === 'gear' && base.k === 'Боєприпаси';
    if (what === 'any') return true;
    if (what === 'ammo') return false;
    const en = base.en.toLowerCase();
    const isSword = /sword|scimitar|rapier/.test(en);
    const isAxe = /axe/.test(en);
    if (what === 'sword') return isSword;
    if (what === 'axe') return isAxe;
    if (what === 'axe|sword') return isSword || isAxe;
    if (what === 'sword-slashing') return isSword && base.w.dt === 'рубана';
    return true;
  }
  if (kind === 'a') return base.c === 'armor' && !!base.ar && what.split('|').includes(base.ar.k) && base.id !== 'hide-armor';
  return false;
}

/** Создаёт предмет из записи библиотеки (для «вибери основу» — с основой). */
export function itemFromLib(e: LibItem, base?: LibItem): Item {
  const x = e.x ?? {};
  const w = e.w ?? base?.w;
  const ar = e.ar ?? base?.ar;
  let name = e.n;
  if (base) name = GENERIC_PLUS.has(e.of ?? '') && x.b ? `${base.n} +${x.b}` : `${e.n} (${base.n})`;
  const magic = e.c === 'magic';
  const text = magic ? `${e.k}\n\n${e.t}`.trim() : e.t;
  const hasEffect = !!(ar || x.ac || x.sv || x.set);
  return newItem({
    name,
    text,
    magic,
    ref: e.id,
    rarity: e.r ?? '',
    attune: !!e.a,
    equipped: hasEffect,
    weapon: w ? weaponFromLib(w) : null,
    armor: ar ? armorFromLib(ar) : null,
    bonus: x.b ?? 0,
    acBonus: ar ? 0 : (x.ac ?? 0),
    saveBonus: x.sv ?? 0,
    setAbility: x.set ? x.set[0] : null,
    setValue: x.set ? x.set[1] : 0,
    noArmor: !!x.noArmor,
  });
}

/**
 * Добавляет предмет из библиотеки: сам предмет, атаку (если это оружие) и ресурс с зарядами.
 * Мутирует персонажа; возвращает созданный предмет.
 */
export function addLibItem(c: Character, e: LibItem, base?: LibItem): Item {
  const item = itemFromLib(e, base);
  // боеприпасы и дротики — пачкой
  if (e.c === 'gear' && /\((\d+)\)/.test(e.n)) item.qty = 1;
  const x = e.x ?? {};
  if (x.ch) {
    const rid = uid();
    c.resources.push({ id: rid, name: item.name, max: x.ch, current: x.ch, die: null, recharge: x.rc === 'dawn' ? 'long' : 'manual', maxPerRoll: null });
    item.resourceId = rid;
  }
  c.equipment.push(item);
  const stored = c.equipment[c.equipment.length - 1];
  if (stored.weapon) addWeaponAttack(c, stored);
  return stored;
}

/** Кубики шкоди заговора на уровне персонажа или заклинания на его базовом уровне. */
export function spellDamageDice(s: LibSpell, charLevel: number): string {
  if (!s.dm) return '';
  if (s.dm.c) {
    let best = '';
    for (const [lvl, d] of Object.entries(s.dm.c)) if (charLevel >= Number(lvl)) best = d;
    return best || Object.values(s.dm.c)[0];
  }
  if (s.dm.s) return s.dm.s[String(s.l)] ?? Object.values(s.dm.s)[0];
  return '';
}

/** Текст карточки заклинания: параметры + описание + «на вищих рівнях». */
export function spellText(s: LibSpell): string {
  const comp = s.cp + (s.mt ? ` (${s.mt})` : '');
  const head = [
    `${s.l === 0 ? 'Заговір' : `${s.l} рівень`}, ${s.sc}${s.ri ? ' (ритуал)' : ''}`,
    `Час: ${s.ct} · Дальність: ${s.rg}`,
    `Компоненти: ${comp}`,
    `Тривалість: ${s.co ? 'концентрація, ' + s.du.charAt(0).toLowerCase() + s.du.slice(1) : s.du}`,
  ].join('\n');
  return `${head}\n\n${s.t}${s.h ? `\n\nНа вищих рівнях. ${s.h}` : ''}`;
}

export function spellFromLib(s: LibSpell): Spell {
  return { id: uid(), level: s.l, name: s.n, prepared: true, text: spellText(s) };
}

/** Атака для заклинания со шкодою: кидок атаки заклинанням или рятунок цілі. */
export function spellAttack(c: Character, s: LibSpell): Attack | null {
  const dice = spellDamageDice(s, c.level);
  if (!dice || (!s.at && !s.sv)) return null;
  return {
    id: uid(),
    name: s.n,
    ability: c.spellcasting.ability,
    prof: true,
    bonus: 0,
    override: null,
    damage: dice,
    damageType: s.dm?.t ?? '',
    note: s.l === 0 ? 'Заговір: кубики ростуть на 5, 11 і 17 рівнях' : `${s.l} рівень; на вищих рівнях — більше`,
    itemId: null,
    save: s.at ? null : (s.sv ?? null),
    saveDc: null,
  };
}
