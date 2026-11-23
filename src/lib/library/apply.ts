/** Превращение записей библиотеки в предметы, атаки, ресурсы и заклинания персонажа. */
import type { Attack, Character, Item, Spell, WeaponStats, ArmorStats } from '../model/types';
import { newItem } from '../model/defaults';
import { uid } from '../model/ids';
import { addWeaponAttack } from '../rules/weapons';
import type { LibItem, LibSpell, LibWeapon, LibArmor } from './types';
import { t } from '../i18n';
import { CHARGES, QTY, powersFor } from './powers';
import { modsFor } from './mods';
import { extraFor, potionEffect, togglesFor } from './effects';
import { rollFormula } from '../dice/formula';
import { cryptoRng } from '../dice/rng';

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
    if (base.c !== 'weapon' || !base.w) return what === 'ammo' && base.c === 'gear' && (base.k === 'Боєприпаси' || base.k === 'Ammunition');
    if (what === 'any') return true;
    if (what === 'ammo') return false;
    const en = base.en.toLowerCase();
    const isSword = /sword|scimitar|rapier/.test(en);
    const isAxe = /axe/.test(en);
    if (what === 'sword') return isSword;
    if (what === 'axe') return isAxe;
    if (what === 'axe|sword') return isSword || isAxe;
    if (what === 'sword-slashing') return isSword && (base.w.dt === 'рубана' || base.w.dt === 'slashing');
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
  let en = e.en;
  if (base) {
    const plus = GENERIC_PLUS.has(e.of ?? '') && x.b;
    name = plus ? `${base.n} +${x.b}` : `${e.n} (${base.n})`;
    en = plus ? `${base.en} +${x.b}` : `${e.en} (${base.en})`;
  }
  const magic = e.c === 'magic';
  const text = magic ? `${e.k}\n\n${e.t}`.trim() : e.t;
  const hasEffect = !!(ar || x.ac || x.sv || x.set);
  return newItem({
    name,
    text,
    magic,
    ref: e.id,
    en,
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
const DECK_ITEMS = new Set(['m:deck-of-illusions', 'm:deck-of-many-things']);

export function addLibItem(c: Character, e: LibItem, base?: LibItem, spells: LibSpell[] = []): Item {
  const item = itemFromLib(e, base);
  // боеприпасы и дротики — пачкой
  if (e.c === 'gear' && /\((\d+)\)/.test(e.n)) item.qty = 1;
  const x = e.x ?? {};
  if (x.ch) {
    const rid = uid();
    // сколько возвращается «на світанку» и что бывает на последнем заряде — из текста SRD (charges.ts)
    const cm = CHARGES[e.id] ?? (e.of ? CHARGES[e.of] : undefined);
    c.resources.push({
      id: rid,
      name: item.name,
      max: x.ch,
      current: x.ch,
      die: null,
      recharge: x.rc === 'dawn' ? 'long' : 'manual',
      maxPerRoll: null,
      regain: cm?.rg ?? null,
      onEmpty: cm?.empty ? { ...cm.empty, on: [...cm.empty.on] } : null,
    });
    item.resourceId = rid;
  }
  // действия (выпить, потратить заряды…) — только тем, кому нужны
  item.powers = powersFor(e, spells);
  item.mods = modsFor(e.id, e.of);
  item.extra = extraFor(e.id);
  item.toggles = togglesFor(e.id);
  // зілля з тривалим ефектом: «Випити» вмикає ефект на персонажі
  const fx = potionEffect(e.id, item.name);
  if (fx) for (const p of item.powers) if (p.consume) p.effect = fx;
  // предмет із пасивними ефектами одразу «надітий» (як перстень захисту)
  if (item.mods.some((m) => !m.when)) item.equipped = true;
  const qf = QTY[e.id];
  if (qf) item.qty = Math.max(1, rollFormula(qf, { rng: cryptoRng }).total);
  // колоды (ілюзій, багатьох речей) — сразу с колодой карт; карты вписываются в её настройках
  if (DECK_ITEMS.has(e.id)) {
    const did = uid();
    c.decks.push({ id: did, name: item.name, cards: [], drawn: [] });
    item.deckId = did;
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
    `${s.l === 0 ? t('spell.text.cantrip') : t('spell.text.level', { n: s.l })}, ${s.sc}${s.ri ? t('spell.text.ritual') : ''}`,
    t('spell.text.time', { ct: s.ct, rg: s.rg }),
    t('spell.text.comp', { c: comp }),
    t('spell.text.dur', { d: s.co ? t('spell.text.conc', { d: s.du.charAt(0).toLowerCase() + s.du.slice(1) }) : s.du }),
  ].join('\n');
  return `${head}\n\n${s.t}${s.h ? `\n\n${t('spell.text.higher')} ${s.h}` : ''}`;
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
    note: s.l === 0 ? t('spell.note.cantrip') : t('spell.note.level', { n: s.l }),
    itemId: null,
    save: s.at ? null : (s.sv ?? null),
    saveDc: null,
  };
}
