/**
 * Действия предметов из библиотеки: «Випити», «Витратити заряди», жезлы и посохи с кубиками.
 * Только для предметов, которым это нужно: расходники (зелья, сувої, боєприпаси, намистини…)
 * и предметы с зарядами. Остальные остаются без действий.
 */
import type { ItemPower } from '../model/types';
import type { LibItem } from './types';
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
  'm:wand-of-magic-missiles': [{ name: ['Чарівна стріла', 'Magic Missile'], cost: 1, costMax: 3, dice: '3d4+3', extra: '1d4+1', result: 'damage', note: '+1 стріла за кожен додатковий заряд' }],
  'm:wand-of-fireballs': [{ name: ['Вогняна куля', 'Fireball'], cost: 1, costMax: 3, dice: '8d6', extra: '1d6', result: 'damage', dc: 15, save: 'dex' }],
  'm:wand-of-lightning-bolts': [{ name: ['Блискавка', 'Lightning Bolt'], cost: 1, costMax: 3, dice: '8d6', extra: '1d6', result: 'damage', dc: 15, save: 'dex' }],
  'm:ring-of-the-ram': [{ name: ['Таран', 'Ram'], cost: 1, costMax: 3, dice: '2d10', extra: '2d10', result: 'damage', note: '+2к10 за кожен додатковий заряд' }],
  'm:staff-of-striking': [{ name: ['Удар силою', 'Force strike'], cost: 1, costMax: 3, dice: '1d6', extra: '1d6', result: 'damage', note: 'після влучання посохом' }],
  'm:staff-of-healing': [
    { name: ['Лікування ран', 'Cure Wounds'], cost: 1, costMax: 4, dice: '1d8', extra: '1d8', result: 'heal', self: false, note: '+ модифікатор заклинань; 1 заряд за коло' },
  ],
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
  };
}

/** Действия для предмета из библиотеки; [] — предмету они не нужны. */
export function powersFor(e: LibItem): ItemPower[] {
  const cur = CURATED[e.id];
  if (cur) return cur.map(make);
  const ch = e.x?.ch;
  if (ch) return [make({ name: ['Витратити заряди', 'Spend charges'], cost: 1, costMax: ch > 1 ? ch : null })];
  if (consumable(e)) return [make({ name: useName(e), consume: true, cost: 1 })];
  return [];
}

/** Стартовое количество формулой (намистини, дози мазі). */
export const QTY: Record<string, string> = {
  'm:necklace-of-fireballs': '1d6+3',
  'm:restorative-ointment': '1d4+1',
};

export { CHARGES };
