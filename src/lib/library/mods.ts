/**
 * Пассивные модификаторы предметов SRD, которых нет в базовой разметке библиотеки:
 * швидкості й чуття, +N до перевірок/мастерства/заклинань, базовий КО, +2 до характеристики до 20.
 * Условные эффекты — подсказкой (when), в числа не входят.
 */
import type { ItemMod } from '../model/types';
import { uid } from '../model/ids';
import { lang } from '../i18n';

type Def = Omit<Partial<ItemMod>, 'id' | 'when'> & { t: string; when?: [string, string] };

const add = (t: string, v: number, cap: number | null = null): Def => ({ t, op: 'add', v, cap });
const set = (t: string, v: number): Def => ({ t, op: 'set', v });
const hint = (uk: string, en: string): Def => ({ t: 'hint', when: [uk, en] });

const MODS: Record<string, Def[]> = {
  'm:goggles-of-night': [set('darkvision', 60)],
  'm:robe-of-eyes': [set('darkvision', 120), hint('Бачиш у всіх напрямках: перевага на Уважність зором', 'See in all directions: advantage on sight-based Perception')],
  'm:belt-of-dwarvenkind': [add('ability:con', 2, 20), set('darkvision', 60), hint('Перевага на рятунки від отрути, опір отруті', 'Advantage on saves against poison, resistance to poison')],
  'm:boots-of-striding-and-springing': [{ t: 'speed', op: 'min', v: 30 }, hint('Стрибаєш утричі далі', 'You can jump three times the normal distance')],
  'm:slippers-of-spider-climbing': [set('climb', 0)],
  'm:cloak-of-arachnida': [set('climb', 0), hint('Опір отруті; ходиш по стінах і стелі', 'Resistance to poison; walk on walls and ceilings')],
  'm:ring-of-swimming': [set('swim', 40)],
  'm:cloak-of-the-manta-ray': [set('swim', 60), hint('Дихаєш під водою, коли капюшон на голові', 'Breathe underwater with the hood up')],
  'm:gloves-of-swimming-and-climbing': [hint('Лазіння й плавання без зайвого руху; +5 до Атлетики, щоб лізти чи плисти', 'Climbing and swimming cost no extra movement; +5 Athletics to climb or swim')],
  'm:cloak-of-the-bat': [hint('Політ 40 фт у темряві чи напівтемряві; перевага на Скритність', 'Fly 40 ft in dim light or darkness; advantage on Stealth')],
  'm:stone-of-good-luck-luckstone': [add('check', 1)],
  'm:wand-of-the-war-mage-1': [add('spellAttack', 1), hint('Атаки заклинаннями ігнорують напівукриття', 'Spell attacks ignore half cover')],
  'm:wand-of-the-war-mage-2': [add('spellAttack', 2), hint('Атаки заклинаннями ігнорують напівукриття', 'Spell attacks ignore half cover')],
  'm:wand-of-the-war-mage-3': [add('spellAttack', 3), hint('Атаки заклинаннями ігнорують напівукриття', 'Spell attacks ignore half cover')],
  'm:robe-of-the-archmagi': [
    set('acBase', 15),
    add('spellDc', 2),
    add('spellAttack', 2),
    hint('Перевага на рятунки проти заклинань і магічних ефектів', 'Advantage on saves against spells and magical effects'),
  ],
  'm:staff-of-power': [add('spellAttack', 2)],
  'm:staff-of-the-magi': [add('spellAttack', 2), hint('Перевага на рятунки проти заклинань', 'Advantage on saves against spells')],
  'm:staff-of-the-woodlands': [add('spellAttack', 2)],
  'm:ioun-stone-of-agility': [add('ability:dex', 2, 20)],
  'm:ioun-stone-of-fortitude': [add('ability:con', 2, 20)],
  'm:ioun-stone-of-insight': [add('ability:wis', 2, 20)],
  'm:ioun-stone-of-intellect': [add('ability:int', 2, 20)],
  'm:ioun-stone-of-leadership': [add('ability:cha', 2, 20)],
  'm:ioun-stone-of-strength': [add('ability:str', 2, 20)],
  'm:ioun-stone-of-mastery': [add('prof', 1)],
  'm:ioun-stone-of-awareness': [hint('Тебе не застати зненацька', 'You can’t be surprised')],
  'm:berserker-axe': [hint('+1 до максимуму ОЗ за кожен рівень, поки налаштований (додайте вручну)', '+1 max HP per level while attuned (add it by hand)')],
  'm:bracers-of-archery': [hint('+2 до шкоди дистанційною зброєю; володіння довгим і коротким луком', '+2 damage with ranged weapons; proficiency with longbow and shortbow')],
  'm:periapt-of-wound-closure': [hint('Стабілізуєшся на 0 ОЗ; кубики здоров’я лікують удвічі', 'You stabilize at 0 HP; hit dice heal double')],
  'm:winged-boots': [hint('Політ = ходьба до 4 годин на день', 'Fly at your walking speed for up to 4 hours a day')],
  'm:boots-of-speed': [hint('Клацнути підборами: швидкість ×2 на 10 хв на день', 'Click the heels: double speed for 10 minutes a day')],
};

function make(d: Def): ItemMod {
  return {
    id: uid(),
    t: d.t,
    op: d.op ?? 'add',
    v: d.v ?? 0,
    cap: d.cap ?? null,
    perLevel: d.perLevel ?? false,
    when: d.when ? d.when[lang === 'en' ? 1 : 0] : '',
  };
}

/** Пассивные модификаторы для предмета из библиотеки ([] — ему не нужны). */
export function modsFor(id: string, parent?: string): ItemMod[] {
  return (MODS[id] ?? (parent ? MODS[parent] : undefined) ?? []).map(make);
}

export const hasMods = (id: string): boolean => id in MODS;
