import type { Character, CodexEntry } from './types';
import { newCharacter, newItem } from './defaults';
import { uid, nowIso } from './ids';

/** Тестовый персонаж пользователя. Цифры предварительные. */
export function fridoSeed(): { character: Character; codex: Omit<CodexEntry, 'characterId'>[] } {
  const c = newCharacter();
  c.name = 'Фридо Брецель';
  c.className = 'Commoner';
  c.level = 5;
  c.race = 'Напіврослик';
  c.background = 'Трактирник';
  c.xp = 6500;
  c.xpNext = 14000;
  c.abilities = { str: 8, dex: 14, con: 16, int: 10, wis: 16, cha: 13 };
  c.ac = 16;
  c.speed = '25';
  c.hp = { max: 43, current: 43, temp: 0 };
  c.hitDice = { die: 'd8', total: 5, used: 0 };
  c.rules.rerollOnes = true;

  c.saves.con.prof = 1;
  c.saves.wis.prof = 1;

  c.skills.deception.ability = 'wis';
  c.skills.deception.prof = 2;
  c.skills.intimidation.ability = 'wis';
  c.skills.intimidation.prof = 1;
  c.skills.persuasion.prof = 1;
  c.skills.persuasion.minD20 = 8;
  c.skills.persuasion.note = '7 і нижче на d20 вважається 8';
  c.skills.insight.prof = 1;
  c.skills.perception.prof = 1;

  c.resources = [
    { id: uid(), name: 'Кубики завзятості', max: 8, current: 8, die: 'd4', recharge: 'short', maxPerRoll: 3 },
  ];
  const panId = uid();
  c.attacks = [
    { id: uid(), name: 'Сковорідка', ability: 'wis', prof: true, bonus: 0, override: null, damage: '1d6+МОД', damageType: 'дробильне', note: '', itemId: panId, save: null, saveDc: null },
  ];
  c.features = [
    { id: uid(), name: 'Трактирник', text: 'Ремесло класу Commoner. Опишіть тут, що вміє Фридо.' },
    { id: uid(), name: 'Везіння напіврослика', text: 'Коли на d20 випадає 1, перекидає кубик і використовує новий результат.' },
  ];
  c.equipment = [
    newItem({ name: 'Колода ілюзій', text: 'Магічний предмет. Карти можна вести як колоду на цій же вкладці.', magic: true }),
    newItem({ id: panId, name: 'Сковорідка' }),
  ];
  c.decks = [{ id: uid(), name: 'Колода ілюзій', cards: [], drawn: [] }];
  c.proficiencies = 'Мови: загальна, мова напіврослих.';

  const t = nowIso();
  const codex: Omit<CodexEntry, 'characterId'>[] = [];
  void t;
  return { character: c, codex };
}
