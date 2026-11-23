/**
 * Действия предметов из библиотеки: «Випити», «Витратити заряди», жезлы и посохи с кубиками.
 * Только для предметов, которым это нужно: расходники (зелья, сувої, боєприпаси, намистини…)
 * и предметы с зарядами. Остальные остаются без действий.
 */
import type { Ability, ItemPower } from '../model/types';
import type { LibItem, LibSpell } from './types';
import { uid } from '../model/ids';
import { lang } from '../i18n';
import { CHARGES } from './charges';

type Def = Partial<Omit<ItemPower, 'id' | 'name'>> & { name: [string, string] };


const DRINK: [string, string] = ['Випити', 'Drink'];
const USE: [string, string] = ['Використати', 'Use'];

const heal = (dice: string): Def[] => [{ name: DRINK, consume: true, cost: 1, dice, result: 'heal', self: true }];

/** Предметы с кубиками и особой ценой. */
const CURATED: Record<string, Def[]> = {
  'm:potion-of-healing-common': heal('2d4+2'),
  'm:potion-of-healing-greater': heal('4d4+4'),
  'm:potion-of-healing-superior': heal('8d4+8'),
  'm:potion-of-healing-supreme': heal('10d4+20'),
  'm:potion-of-heroism': [{ name: DRINK, consume: true, cost: 1, dice: '10', result: 'temp', self: true, note: '+ благословення на 1 годину' }],
  'm:restorative-ointment': [{ name: ['Нанести дозу', 'Apply a dose'], consume: true, cost: 1, dice: '2d8+2', result: 'heal', self: true }],
  'm:bead-of-force': [{ name: ['Кинути', 'Throw'], consume: true, cost: 1, dice: '5d4', result: 'damage', dc: 15, save: 'dex' }],
  'm:necklace-of-fireballs': [
    { name: ['Кинути намистину', 'Throw a bead'], consume: true, cost: 1, costMax: 9, dice: '4d6', extra: '1d6', result: 'damage', dc: 15, save: 'dex', note: '+1к6 за кожну додаткову намистину' },
  ],
  'm:ring-of-the-ram': [{ name: ['Таран', 'Ram'], cost: 1, costMax: 3, dice: '2d10', extra: '2d10', result: 'damage', note: '+2к10 за кожен додатковий заряд' }],
  'm:staff-of-striking': [{ name: ['Удар силою', 'Force strike'], cost: 1, costMax: 3, dice: '1d6', extra: '1d6', result: 'damage', note: 'після влучання посохом' }],
};

/**
 * Заклинания из предметов: [id заклинания, цена в зарядах, опции].
 * dc: число предмета или 'user' — ваш СК (посохи). level — уровень каста (Посох сили: «Вогняна куля» 5-го кола).
 * upTo — усиление: +1 коло за кожен заряд понад мінімум, до такого кола.
 */
type SpellRow = [string, number, { level?: number; upTo?: number }?];
const SPELLS: Record<string, { dc: number | 'user' | null; list: SpellRow[] }> = {
  'm:staff-of-fire': { dc: 'user', list: [['burning-hands', 1], ['fireball', 3], ['wall-of-fire', 4]] },
  'm:staff-of-frost': { dc: 'user', list: [['fog-cloud', 1], ['ice-storm', 4], ['wall-of-ice', 4], ['cone-of-cold', 5]] },
  'm:staff-of-healing': { dc: 'user', list: [['cure-wounds', 1, { upTo: 4 }], ['lesser-restoration', 2], ['mass-cure-wounds', 5]] },
  'm:staff-of-power': {
    dc: 'user',
    list: [
      ['magic-missile', 1],
      ['ray-of-enfeeblement', 1],
      ['levitate', 2],
      ['cone-of-cold', 5],
      ['fireball', 5, { level: 5 }],
      ['hold-monster', 5],
      ['lightning-bolt', 5, { level: 5 }],
      ['wall-of-force', 5],
      ['globe-of-invulnerability', 6],
    ],
  },
  'm:staff-of-the-magi': {
    dc: 'user',
    list: [
      ['arcane-lock', 0],
      ['detect-magic', 0],
      ['enlarge-reduce', 0],
      ['light', 0],
      ['mage-hand', 0],
      ['protection-from-evil-and-good', 0],
      ['flaming-sphere', 2],
      ['invisibility', 2],
      ['knock', 2],
      ['web', 2],
      ['dispel-magic', 3],
      ['ice-storm', 4],
      ['wall-of-fire', 4],
      ['passwall', 5],
      ['telekinesis', 5],
      ['conjure-elemental', 7],
      ['plane-shift', 7],
      ['fireball', 7, { level: 7 }],
      ['lightning-bolt', 7, { level: 7 }],
    ],
  },
  'm:staff-of-the-woodlands': {
    dc: 'user',
    list: [
      ['pass-without-trace', 0],
      ['animal-friendship', 1],
      ['speak-with-animals', 1],
      ['barkskin', 2],
      ['locate-animals-or-plants', 2],
      ['speak-with-plants', 3],
      ['awaken', 5],
      ['wall-of-thorns', 6],
    ],
  },
  'm:staff-of-swarming-insects': { dc: 'user', list: [['giant-insect', 4], ['insect-plague', 5]] },
  'm:staff-of-charming': { dc: 'user', list: [['charm-person', 1], ['command', 1], ['comprehend-languages', 1]] },
  'm:wand-of-binding': { dc: 17, list: [['hold-person', 2], ['hold-monster', 5]] },
  'm:wand-of-fireballs': { dc: 15, list: [['fireball', 1, { level: 3, upTo: 9 }]] },
  'm:wand-of-lightning-bolts': { dc: 15, list: [['lightning-bolt', 1, { level: 3, upTo: 9 }]] },
  'm:wand-of-magic-missiles': { dc: null, list: [['magic-missile', 1, { level: 1, upTo: 7 }]] },
  'm:wand-of-web': { dc: 15, list: [['web', 1]] },
  'm:wand-of-polymorph': { dc: 15, list: [['polymorph', 1]] },
  'm:wand-of-magic-detection': { dc: null, list: [['detect-magic', 1]] },
  'm:ring-of-elemental-command-fire': { dc: 17, list: [['burning-hands', 1], ['fireball', 2], ['wall-of-fire', 3]] },
  'm:ring-of-elemental-command-air': { dc: 17, list: [['wind-wall', 1], ['gust-of-wind', 2], ['chain-lightning', 3]] },
  'm:ring-of-elemental-command-earth': { dc: 17, list: [['stone-shape', 2], ['stoneskin', 3], ['wall-of-stone', 3]] },
  'm:ring-of-elemental-command-water': { dc: 17, list: [['create-or-destroy-water', 1], ['ice-storm', 2], ['control-water', 3], ['wall-of-ice', 3]] },
  'm:medallion-of-thoughts': { dc: 13, list: [['detect-thoughts', 1]] },
  'm:ring-of-animal-influence': { dc: 13, list: [['animal-friendship', 1], ['fear', 1], ['speak-with-animals', 1]] },
  'm:helm-of-teleportation': { dc: null, list: [['teleport', 1]] },
  'm:trident-of-fish-command': { dc: 15, list: [['dominate-beast', 1]] },
};

/**
 * «Раз на день» (до світанку) і «раз на N днів»: властивості, які не витрачають заряди.
 * spell — заклинання з бібліотеки (назва й кубики звідти); n — скільки разів; days — раз на скільки днів.
 */
type DailyDef = Omit<Def, 'name' | 'note'> & { name?: [string, string]; note?: [string, string]; n?: number; days?: number };
const ELEMENTAL: DailyDef[] = [{ spell: 'conjure-elemental' }];
const TRICKS: DailyDef[] = [{ name: ['Витягти звірятко', 'Pull a fuzzy object'], dice: '1d8', n: 3, note: ['к8 за таблицею мішка', 'd8 on the bag’s table'] }];
const FIGURINE = (days: number, n = 1): DailyDef[] => [{ name: ['Оживити фігурку', 'Bring to life'], days, n }];
const HORN = (dice: string): DailyDef[] => [{ name: ['Засурмити', 'Blow the horn'], dice, days: 7, note: ['стільки берсерків з’являється на 1 годину', 'berserkers appear for 1 hour'] }];
const DAILY: Record<string, DailyDef[]> = {
  'm:armor-of-invulnerability': [{ name: ['Невразливість', 'Invulnerability'], note: ['імунітет до немагічної шкоди на 10 хв', 'immune to nonmagical damage for 10 minutes'] }],
  'm:bag-of-tricks': TRICKS,
  'm:bowl-of-commanding-water-elementals': ELEMENTAL,
  'm:brazier-of-commanding-fire-elementals': ELEMENTAL,
  'm:censer-of-controlling-air-elementals': ELEMENTAL,
  'm:stone-of-controlling-earth-elementals': ELEMENTAL,
  'm:cape-of-the-mountebank': [{ spell: 'dimension-door' }],
  'm:circlet-of-blasting': [{ spell: 'scorching-ray', attack: 5 }],
  'm:cloak-of-arachnida': [{ spell: 'web', dc: 13 }],
  'm:cloak-of-the-bat': [{ spell: 'polymorph', note: ['лише на себе — у кажана, у темряві', 'only yourself, into a bat, in dim light or darkness'] }],
  'm:crystal-ball-of-telepathy': [{ spell: 'suggestion', dc: 17, note: ['через сенсор «Віддаленого бачення»', 'through the scrying sensor'] }],
  'm:helm-of-telepathy': [{ spell: 'suggestion', dc: 13 }],
  'm:plate-armor-of-etherealness': [{ spell: 'etherealness' }],
  'm:wind-fan': [{ spell: 'gust-of-wind', dc: 13, note: ['повторно до світанку — 20% порватися (накопичується)', 'again before dawn: 20% cumulative chance to tear'] }],
  'm:dagger-of-venom': [{ name: ['Отрута на клинку', 'Poison the blade'], dice: '2d10', result: 'damage', dc: 15, save: 'con', note: ['отрута, + отруєний на 1 хв', 'poison, + poisoned for 1 minute'] }],
  'm:javelin-of-lightning': [{ name: ['Блискавка', 'Lightning bolt'], dice: '4d6', result: 'damage', dc: 13, save: 'dex', note: ['лінія 120 фт; ціль — атака списом +4к6', '120-ft line; the target takes the javelin attack +4d6'] }],
  'm:dragon-scale-mail': [{ name: ['Чуття дракона', 'Sense dragon'], note: ['відстань і напрям до найближчого такого дракона в межах 30 миль', 'distance and direction to the closest such dragon within 30 miles'] }],
  'm:iron-bands-of-binding': [{ name: ['Кинути', 'Throw'], note: ['атака: Спритність + майстерність; ціль схоплена (Сила СК 20)', 'attack: Dex + proficiency; target restrained (DC 20 Strength)'] }],
  'm:luck-blade': [{ name: ['Удача', 'Luck'], note: ['перекинути атаку, перевірку чи рятунок', 'reroll an attack, check or save'] }],
  'm:pearl-of-power': [{ name: ['Відновити комірку', 'Regain a slot'], note: ['одна витрачена комірка, не вище 3-го кола', 'one expended slot, 3rd level at most'] }],
  'm:rod-of-alertness': [{ name: ['Захисна аура', 'Protective aura'], note: ['+1 до КО й рятунків союзникам у світлі, 10 хв', '+1 AC and saves for allies in the light, 10 minutes'] }],
  'm:rod-of-lordly-might': [
    { name: ['Висмоктати життя', 'Drain life'], dice: '4d6', result: 'damage', dc: 17, save: 'con', note: ['після влучання; лікуєшся на половину', 'on a hit; you regain half'] },
    { name: ['Паралізувати', 'Paralyze'], dc: 17, save: 'str', note: ['після влучання, на 1 хв', 'on a hit, for 1 minute'] },
    { name: ['Налякати', 'Terrify'], dc: 17, save: 'wis', note: ['усі в межах 30 фт, на 1 хв', 'everyone within 30 ft, for 1 minute'] },
  ],
  'm:rod-of-rulership': [{ name: ['Владарювати', 'Rulership'], dc: 15, save: 'wis', note: ['зачаровує в межах 120 фт на 8 годин', 'charms within 120 ft for 8 hours'] }],
  'm:rod-of-security': [{ name: ['Рай', 'Paradise'], days: 10 }],
  'm:staff-of-charming': [{ name: ['Відбити чари', 'Shrug off a charm'], note: ['провалений рятунок проти чар на тебе — успіх', 'turn a failed save against an enchantment into a success'] }],
  'm:staff-of-thunder-and-lightning': [
    { name: ['Блискавка', 'Lightning'], dice: '2d6', result: 'damage', note: ['після влучання посохом', 'on a melee hit'] },
    { name: ['Грім', 'Thunder'], dc: 17, save: 'con', note: ['після влучання: приголомшений до кінця твого ходу', 'on a hit: stunned until the end of your next turn'] },
    { name: ['Удар блискавки', 'Lightning strike'], dice: '9d6', result: 'damage', dc: 17, save: 'dex', note: ['лінія 120 фт', '120-ft line'] },
    { name: ['Громовий удар', 'Thunderclap'], dice: '2d6', result: 'damage', dc: 17, save: 'con', note: ['усі в межах 60 фт, оглушені на 1 хв', 'everyone within 60 ft, deafened for 1 minute'] },
    { name: ['Грім і блискавка', 'Thunder and lightning'], note: ['удар блискавки й громовий удар разом, не витрачаючи їх', 'strike and thunderclap at once without spending them'] },
  ],
  'm:horn-of-valhalla-silver': HORN('2d4+2'),
  'm:horn-of-valhalla-brass': HORN('3d4+3'),
  'm:horn-of-valhalla-bronze': HORN('4d4+4'),
  'm:horn-of-valhalla-iron': HORN('5d4+5'),
  'm:figurine-of-wondrous-power-bronze-griffon': FIGURINE(5),
  'm:figurine-of-wondrous-power-ebony-fly': FIGURINE(2),
  'm:figurine-of-wondrous-power-golden-lions': FIGURINE(7, 2),
  'm:figurine-of-wondrous-power-marble-elephant': FIGURINE(7),
  'm:figurine-of-wondrous-power-obsidian-steed': FIGURINE(5),
  'm:figurine-of-wondrous-power-onyx-dog': FIGURINE(7),
  'm:figurine-of-wondrous-power-serpentine-owl': FIGURINE(2),
  'm:figurine-of-wondrous-power-silver-raven': FIGURINE(2),
};

export function dailyPowers(e: LibItem, spells: LibSpell[]): ItemPower[] {
  const defs = DAILY[e.id] ?? (e.of ? DAILY[e.of] : undefined);
  if (!defs) return [];
  const byId = new Map(spells.map((x) => [x.id, x]));
  const en = lang === 'en' ? 1 : 0;
  return defs.map(({ n, days, note, name, ...d }) => {
    const lib = d.spell ? byId.get(d.spell) : undefined;
    const p = make({
      ...d,
      name: name ?? [lib?.n ?? d.spell ?? '', lib?.en ?? d.spell ?? ''],
      save: d.save ?? lib?.sv ?? null,
      note: note ? note[en] : '',
    });
    p.uses = { max: n ?? 1, used: 0, days: days ?? 1 };
    return p;
  });
}

export const hasDaily = (e: LibItem): boolean => e.id in DAILY || (!!e.of && e.of in DAILY);

/** Сувої: коло, СК і бонус атаки за таблицею SRD; заклинання обирається в картці. */
const SCROLLS: Record<string, [number, number, number]> = {
  'm:spell-scroll-cantrip': [0, 13, 5],
  'm:spell-scroll-1st': [1, 13, 5],
  'm:spell-scroll-2nd': [2, 13, 5],
  'm:spell-scroll-3rd': [3, 15, 7],
  'm:spell-scroll-4th': [4, 15, 7],
  'm:spell-scroll-5th': [5, 17, 9],
  'm:spell-scroll-6th': [6, 17, 9],
  'm:spell-scroll-7th': [7, 18, 10],
  'm:spell-scroll-8th': [8, 18, 10],
  'm:spell-scroll-9th': [9, 19, 11],
};

/** Расходник без кубиков: зелья, масла, порошки, сувої, боєприпаси. */
function consumable(e: LibItem): boolean {
  return e.mc === 'potion' || e.mc === 'scroll' || e.mc === 'ammunition' || /\b(dust|bead|ointment|elixir|philter|feather token|elemental gem)\b/i.test(e.en);
}

function useName(e: LibItem): [string, string] {
  if (e.mc === 'potion') return /oil/i.test(e.en) ? ['Нанести', 'Apply'] : DRINK;
  if (e.mc === 'scroll') return ['Прочитати', 'Read'];
  return USE;
}

function make(d: Def): ItemPower {
  return {
    id: uid(),
    name: d.name[lang === 'en' ? 1 : 0],
    cost: d.cost ?? 0,
    costMax: d.costMax ?? null,
    consume: d.consume ?? false,
    dice: d.dice ?? '',
    extra: d.extra ?? '',
    result: d.result ?? 'info',
    self: d.self ?? true,
    dc: d.dc ?? null,
    save: d.save ?? null,
    note: d.note ?? '',
    spell: d.spell ?? null,
    level: d.level ?? 0,
    upcast: d.upcast ?? false,
    dcUser: d.dcUser ?? false,
    attack: d.attack ?? null,
    effect: d.effect ?? null,
    uses: d.uses ?? null,
    boost: d.boost ?? null,
  };
}

/** Действия для предмета из библиотеки; [] — предмету они не нужны. spells — чтобы подписать заклинания по-людськи. */
export function powersFor(e: LibItem, spells: LibSpell[] = []): ItemPower[] {
  return [...basePowers(e, spells), ...dailyPowers(e, spells)];
}

/** Посібники й томи: 48 годин читання — характеристика +2 (і її максимум), книга втрачає магію на століття. */
const BOOKS: Record<string, Ability> = {
  'm:manual-of-bodily-health': 'con',
  'm:manual-of-gainful-exercise': 'str',
  'm:manual-of-quickness-of-action': 'dex',
  'm:tome-of-clear-thought': 'int',
  'm:tome-of-leadership-and-influence': 'cha',
  'm:tome-of-understanding': 'wis',
};

function basePowers(e: LibItem, spells: LibSpell[]): ItemPower[] {
  const book = BOOKS[e.id];
  if (book)
    return [
      make({
        name: ['Прочитати', 'Study'],
        boost: book,
        note: lang === 'en' ? '48 hours over 6 days; then the book loses its magic for a century' : '48 годин за 6 днів; потім книга втрачає магію на століття',
      }),
    ];
  const cur = CURATED[e.id];
  if (cur) return cur.map(make);
  const sp = SPELLS[e.id];
  if (sp) {
    const byId = new Map(spells.map((x) => [x.id, x]));
    return sp.list.map(([id, cost, o]) => {
      const lib = byId.get(id);
      const lvl = o?.level ?? lib?.l ?? 0;
      return make({
        name: [lib?.n ?? id, lib?.en ?? id],
        spell: id,
        level: lvl,
        cost,
        costMax: o?.upTo ? cost + (o.upTo - lvl) : null,
        upcast: !!o?.upTo,
        dc: typeof sp.dc === 'number' ? sp.dc : null,
        dcUser: sp.dc === 'user',
        save: lib?.sv ?? null,
      });
    });
  }
  const sc = SCROLLS[e.id];
  if (sc) return [make({ name: ['Прочитати', 'Read'], consume: true, cost: 1, spell: '', level: sc[0], dc: sc[1], attack: sc[2] })];
  const ch = e.x?.ch;
  if (ch) return [make({ name: ['Витратити заряди', 'Spend charges'], cost: 1, costMax: ch > 1 ? ch : null })];
  if (consumable(e)) return [make({ name: useName(e), consume: true, cost: 1 })];
  return [];
}

/** У предмета есть заклинания из таблицы (для обновления старых записей). */
export const hasSpells = (id: string): boolean => id in SPELLS || id in SCROLLS;

/** Стартовое количество формулой (намистини, дози мазі). */
export const QTY: Record<string, string> = {
  'm:necklace-of-fireballs': '1d6+3',
  'm:restorative-ointment': '1d4+1',
};

export { CHARGES };
