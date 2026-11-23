/**
 * Включаемые эффекты предметов SRD: переключатели (Вогняний язик, Чоботи швидкості…),
 * доп. урон зброї (завжди / проти виду істот / на критичному) и временные эффекты зелий.
 */
import type { ActiveEffect, ExtraDamage, ItemToggle } from '../model/types';
import { uid } from '../model/ids';
import { lang } from '../i18n';
import { add, hint, makeMod, set, type ModDef } from './mods';

const L = (uk: string, en: string) => (lang === 'en' ? en : uk);
type X = { dice: string; type: [string, string]; when?: [string, string]; crit?: boolean };
const x = (d: X): ExtraDamage => ({ id: uid(), dice: d.dice, type: L(...d.type), when: d.when ? L(...d.when) : '', crit: !!d.crit });

const FIRE: [string, string] = ['вогонь', 'fire'];
const RADIANT: [string, string] = ['промениста', 'radiant'];
const UNDEAD_FIENDS: [string, string] = ['проти виначок і нежиті', 'vs fiends and undead'];

/** Доп. урон зброї (без переключателя). */
const EXTRA: Record<string, X[]> = {
  'm:frost-brand': [{ dice: '1d6', type: ['холод', 'cold'] }],
  'm:dragon-slayer': [{ dice: '3d6', type: ['тип зброї', 'weapon type'], when: ['проти драконів', 'vs dragons'] }],
  'm:giant-slayer': [{ dice: '2d6', type: ['тип зброї', 'weapon type'], when: ['проти велетнів', 'vs giants'] }],
  'm:holy-avenger': [{ dice: '2d10', type: RADIANT, when: UNDEAD_FIENDS }],
  'm:mace-of-disruption': [{ dice: '2d6', type: RADIANT, when: UNDEAD_FIENDS }],
  'm:sun-blade': [{ dice: '1d8', type: RADIANT, when: ['проти нежиті', 'vs undead'] }],
  'm:dwarven-thrower': [
    { dice: '1d8', type: ['тип зброї', 'weapon type'], when: ['кинутий', 'thrown'] },
    { dice: '2d8', type: ['тип зброї', 'weapon type'], when: ['кинутий у велетня', 'thrown at a giant'] },
  ],
  'm:oathbow': [{ dice: '3d6', type: ['колота', 'piercing'], when: ['проти заклятого ворога', 'vs sworn enemy'] }],
  'm:vicious-weapon': [{ dice: '2d6', type: ['тип зброї', 'weapon type'], crit: true }],
  'm:sword-of-life-stealing': [{ dice: '3d6', type: ['некротична', 'necrotic'], crit: true }],
};

type T = { name: [string, string]; mods?: ModDef[]; extra?: X[]; note?: [string, string] };
const TOGGLES: Record<string, T[]> = {
  'm:flame-tongue': [{ name: ['Запалити', 'Ignite'], extra: [{ dice: '2d6', type: FIRE }], note: ['Бонусна дія; світло 40 фт', 'Bonus action; bright light 40 ft'] }],
  'm:boots-of-speed': [
    {
      name: ['Клацнути підборами', 'Click the heels'],
      mods: [{ t: 'speed', op: 'mul', v: 2 }, hint('Атаки по тобі з перешкодою', 'Attacks against you have disadvantage')],
      note: ['До 10 хв на довгий відпочинок', 'Up to 10 minutes per long rest'],
    },
  ],
  'm:cloak-of-elvenkind': [{ name: ['Накинути каптур', 'Raise the hood'], mods: [hint('Перевага на Скритність; Уважність зором проти тебе з перешкодою', 'Advantage on Stealth; sight Perception against you has disadvantage')] }],
  'm:winged-boots': [{ name: ['Летіти', 'Fly'], mods: [set('fly', 0)], note: ['До 4 год польоту на день', 'Up to 4 hours of flight a day'] }],
  'm:wings-of-flying': [{ name: ['Розкрити крила', 'Spread the wings'], mods: [set('fly', 60)], note: ['1 год, потім 1к12 год перерви', '1 hour, then 1d12 hours to recover'] }],
  'm:ring-of-invisibility': [{ name: ['Стати невидимим', 'Turn invisible'], mods: [hint('Ти невидимий, доки не атакуєш чи не закляттям', 'You are invisible until you attack or cast')] }],
  'm:sun-blade': [{ name: ['Клинок світла', 'Blade of light'], mods: [hint('Яскраве світло 15 фт', 'Bright light 15 ft')] }],
};

/** Эффекты зелий: выпил — на персонаже временный эффект. */
type P = { mods: ModDef[]; dur: [string, string] };
const HOUR: [string, string] = ['1 година', '1 hour'];
const giant = (v: number): P => ({ mods: [set('ability:str', v)], dur: HOUR });
const resist = (_uk: string, en: string): P => ({ mods: [{ t: `resist:${en}`, op: 'set', v: 1 }], dur: HOUR });
const POTIONS: Record<string, P> = {
  'm:potion-of-giant-strength-hill': giant(21),
  'm:potion-of-giant-strength-frost': giant(23),
  'm:potion-of-giant-strength-stone': giant(23),
  'm:potion-of-giant-strength-fire': giant(25),
  'm:potion-of-giant-strength-cloud': giant(27),
  'm:potion-of-giant-strength-storm': giant(29),
  'm:potion-of-speed': {
    mods: [{ t: 'speed', op: 'mul', v: 2 }, add('ac', 2), hint('Перевага на рятунки Вправності; додаткова дія', 'Advantage on Dex saves; an extra action')],
    dur: ['1 хвилина', '1 minute'],
  },
  'm:potion-of-flying': { mods: [set('fly', 0)], dur: HOUR },
  'm:potion-of-climbing': { mods: [set('climb', 0), hint('Перевага на Атлетику, щоб лізти', 'Advantage on Athletics to climb')], dur: HOUR },
  'm:potion-of-water-breathing': { mods: [hint('Дихаєш під водою', 'You can breathe underwater')], dur: ['1 година', '1 hour'] },
  'm:potion-of-invisibility': { mods: [hint('Невидимий, доки не атакуєш чи не закляттям', 'Invisible until you attack or cast')], dur: HOUR },
  'm:potion-of-growth': { mods: [hint('Збільшення: перевага на Силу, +1к4 шкоди зброєю', 'Enlarged: advantage on Strength, +1d4 weapon damage')], dur: ['1к4 години', '1d4 hours'] },
  'm:potion-of-diminution': { mods: [hint('Зменшення: перешкода на Силу, −1к4 шкоди зброєю', 'Reduced: disadvantage on Strength, −1d4 weapon damage')], dur: ['1к4 години', '1d4 hours'] },
  'm:potion-of-heroism': { mods: [hint('Благословення: +1к4 до атак і рятунків', 'Bless: +1d4 to attacks and saves')], dur: HOUR },
  'm:potion-of-resistance-acid': resist('кислота', 'acid'),
  'm:potion-of-resistance-cold': resist('холод', 'cold'),
  'm:potion-of-resistance-fire': resist('вогонь', 'fire'),
  'm:potion-of-resistance-force': resist('силова', 'force'),
  'm:potion-of-resistance-lightning': resist('блискавка', 'lightning'),
  'm:potion-of-resistance-necrotic': resist('некротична', 'necrotic'),
  'm:potion-of-resistance-poison': resist('отрута', 'poison'),
  'm:potion-of-resistance-psychic': resist('психічна', 'psychic'),
  'm:potion-of-resistance-radiant': resist('промениста', 'radiant'),
  'm:potion-of-resistance-thunder': resist('звук', 'thunder'),
};

export function extraFor(id: string): ExtraDamage[] {
  return (EXTRA[id] ?? []).map(x);
}
export function togglesFor(id: string): ItemToggle[] {
  return (TOGGLES[id] ?? []).map((tg) => ({
    id: uid(),
    name: L(...tg.name),
    on: false,
    mods: (tg.mods ?? []).map(makeMod),
    extra: (tg.extra ?? []).map(x),
    note: tg.note ? L(...tg.note) : '',
  }));
}
/** Эффект зелья для действия «Випити» (null — у зелья нет длительного эффекта). */
export function potionEffect(id: string, name: string): Omit<ActiveEffect, 'id' | 'source' | 'conc'> | null {
  const p = POTIONS[id];
  return p ? { name, mods: p.mods.map(makeMod), duration: L(...p.dur) } : null;
}
export const hasEffects = (id: string): boolean => id in EXTRA || id in TOGGLES || id in POTIONS;
