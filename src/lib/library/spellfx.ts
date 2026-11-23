/**
 * Що заклинання робить з тобою, якщо скастувати на себе: модифікатори (Щит +5 КО, Обладунок мага 13+Спр)
 * або підказка (Благословення +1к4). Лише бафи; шкода — через атаки.
 */
import type { ItemMod } from '../model/types';
import { add, hint, makeMod, res, set, type ModDef } from './mods';

const FX: Record<string, ModDef[]> = {
  shield: [add('ac', 5), hint('Імунітет до «Магічної стріли»', 'Immune to magic missile')],
  'mage-armor': [set('acBase', 13)],
  'shield-of-faith': [add('ac', 2)],
  haste: [{ t: 'speed', op: 'mul', v: 2 }, add('ac', 2), hint('Перевага на рятунки Спр; додаткова дія', 'Advantage on Dex saves; an extra action')],
  longstrider: [add('speed', 10)],
  'expeditious-retreat': [hint('Ривок бонусною дією', 'Dash as a bonus action')],
  bless: [hint('+1к4 до атак і рятунків', '+1d4 to attacks and saves')],
  guidance: [hint('+1к4 до однієї перевірки', '+1d4 to one ability check')],
  resistance: [hint('+1к4 до одного рятунку', '+1d4 to one saving throw')],
  heroism: [hint('Імунітет до страху; тимчасові ОЗ щоходу', 'Immune to fear; temporary HP each turn')],
  barkskin: [hint('КО не менше 16', 'AC can’t be lower than 16')],
  blur: [hint('Атаки проти тебе — з перешкодою', 'Attacks against you have disadvantage')],
  'mirror-image': [hint('Три двійники відволікають атаки', 'Three duplicates draw attacks')],
  fly: [set('fly', 60)],
  'spider-climb': [set('climb', 0), hint('Ходиш по стінах і стелі', 'Walk on walls and ceilings')],
  darkvision: [set('darkvision', 60)],
  invisibility: [hint('Невидимий, доки не атакуєш чи не закляттям', 'Invisible until you attack or cast')],
  'greater-invisibility': [hint('Невидимий: атаки з перевагою, проти тебе — з перешкодою', 'Invisible: advantage on attacks, disadvantage against you')],
  stoneskin: [res('nonmagical')],
  'enhance-ability': [hint('Перевага на перевірки обраної характеристики', 'Advantage on checks with the chosen ability')],
  'death-ward': [hint('Перший удар до 0 ОЗ лишає 1 ОЗ', 'The first drop to 0 HP leaves you at 1')],
  'freedom-of-movement': [hint('Ніщо не сповільнює і не сковує', 'Nothing slows or restrains you')],
  'water-breathing': [hint('Дихаєш під водою', 'Breathe underwater')],
  'protection-from-energy': [res('')],
  'protection-from-evil-and-good': [hint('Аберації, феї, нежить тощо атакують тебе з перешкодою', 'Aberrations, fey, undead etc. attack you with disadvantage')],
  jump: [hint('Стрибаєш утричі далі', 'Jump three times as far')],
  'see-invisibility': [hint('Бачиш невидиме', 'See invisible creatures')],
  'true-seeing': [hint('Істинний зір 120 фт', 'Truesight 120 ft')],
  foresight: [hint('Перевага на все; проти тебе — з перешкодою', 'Advantage on everything; disadvantage against you')],
  aid: [hint('+5 до поточних і максимальних ОЗ (додайте вручну)', '+5 current and max HP (add by hand)')],
};

export const hasSpellFx = (id: string | null | undefined): boolean => !!id && id in FX;
export function spellFx(id: string | null | undefined): ItemMod[] {
  return id && FX[id] ? FX[id].map(makeMod) : [];
}
