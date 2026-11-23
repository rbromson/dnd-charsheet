export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export type SkillKey =
  | 'acrobatics' | 'insight' | 'performance' | 'athletics' | 'survival' | 'animalHandling'
  | 'intimidation' | 'history' | 'medicine' | 'arcana' | 'deception' | 'investigation'
  | 'persuasion' | 'nature' | 'religion' | 'stealth' | 'sleightOfHand' | 'perception';

/** Порядок и характеристики по умолчанию — как в украинском PDF (по алфавиту). */
export const SKILLS: { key: SkillKey; ability: Ability }[] = [
  { key: 'acrobatics', ability: 'dex' },
  { key: 'insight', ability: 'wis' },
  { key: 'performance', ability: 'cha' },
  { key: 'athletics', ability: 'str' },
  { key: 'survival', ability: 'wis' },
  { key: 'animalHandling', ability: 'wis' },
  { key: 'intimidation', ability: 'cha' },
  { key: 'history', ability: 'int' },
  { key: 'medicine', ability: 'wis' },
  { key: 'arcana', ability: 'int' },
  { key: 'deception', ability: 'cha' },
  { key: 'investigation', ability: 'int' },
  { key: 'persuasion', ability: 'cha' },
  { key: 'nature', ability: 'int' },
  { key: 'religion', ability: 'int' },
  { key: 'stealth', ability: 'dex' },
  { key: 'sleightOfHand', ability: 'dex' },
  { key: 'perception', ability: 'wis' },
];

/** 0 — нет, 1 — владение, 2 — экспертиза */
export type Prof = 0 | 1 | 2;

/** Число, которое считается автоматически, но имеет доп. бонус и ручное переопределение. */
export interface Tweak {
  bonus: number;
  override: number | null;
}

export interface SkillState extends Tweak {
  prof: Prof;
  ability: Ability;
  /** Минимум на грани d20 («7 и ниже считается 8» → 8) */
  minD20: number | null;
  note: string;
}

export interface SaveState extends Tweak {
  prof: 0 | 1;
}

export interface Attack extends Tweak {
  id: string;
  name: string;
  /** null — без характеристики */
  ability: Ability | null;
  prof: boolean;
  /** Например `1d6+МОД` */
  damage: string;
  damageType: string;
  note: string;
  /** Если атака создана из предмета снаряжения (оружие) — его id; имя синхронизируется с предметом */
  itemId: string | null;
  /** Вместо кидка атаки цель кидает рятунок этой характеристики (напр. «Злісна насмішка»); null — обычная атака */
  save: Ability | null;
  /** СК рятунку вручную; null — 8 + бонус майстерності + модифікатор характеристики атаки */
  saveDc: number | null;
}

export type Recharge = 'short' | 'long' | 'manual';

export interface Resource {
  id: string;
  name: string;
  max: number;
  current: number;
  /** Кость ресурса, например 'd4'; null — просто счётчик */
  die: string | null;
  /** short — восстанавливается после любого отдыха; long — только после длинного */
  recharge: Recharge;
  /** Сколько единиц можно потратить на один бросок; null — без ограничения */
  maxPerRoll: number | null;
  /** сколько восстанавливается на длинном отдыхе («на світанку»): '1d6+1'; null — до максимума */
  regain: string | null;
  /** что бывает, когда потрачен последний заряд (жезлы, посохи) */
  onEmpty: Risk | null;
}

/** Бросок риска: «на 1 з d20 предмет руйнується». */
export interface Risk {
  die: number;
  on: number[];
  /** destroy — предмет зникає; mundane — стає звичайним; partial — втрачає властивості, крім бонусу; gain — отримує заряди */
  kind: 'destroy' | 'mundane' | 'partial' | 'gain';
  /** для gain: скільки зарядів, формула */
  gain: string;
}

/** Действие предмета: выпить зелье, потратить заряды жезла, бросить бусину. */
export interface ItemPower {
  id: string;
  name: string;
  /** сколько зарядов предмета (item.resourceId) стоит; 0 — без зарядов */
  cost: number;
  /** можно потратить больше (усиление): до скольких; null — ровно cost */
  costMax: number | null;
  /** тратит штуку предмета (qty − 1 за каждую единицу цены) */
  consume: boolean;
  /** кубики результата: '2d4+2'; '' — без броска */
  dice: string;
  /** добавка за каждую единицу сверх cost: '1d6' */
  extra: string;
  /** heal/temp применяются к себе, если self */
  result: 'heal' | 'temp' | 'damage' | 'info';
  self: boolean;
  /** СК рятунку предмета (жезл вогняних куль — 15) */
  dc: number | null;
  save: Ability | null;
  note: string;
  /** заклинание из библиотеки (id); '' — ещё не выбрано (сувій); null — не заклинание */
  spell: string | null;
  /** уровень, которым кастуется (0 — уровень самого заклинания) */
  level: number;
  /** каждая единица цены сверх минимальной поднимает уровень на 1 (жезлы) */
  upcast: boolean;
  /** СК и атака — ваши (посохи), а не предмета */
  dcUser: boolean;
  /** бонус атаки предмета (сувій: +5…+11); null — ваш или нет атаки */
  attack: number | null;
  /** выпить/нанести — и на персонаже появляется временный эффект (зілля сили, польоту…) */
  effect: { name: string; mods: ItemMod[]; duration: string } | null;
  /** «раз на день»: скільки разів до світанку (days = 1) або раз на N днів (ріг Валгалли — 7) */
  uses: PowerUses | null;
}

export interface PowerUses {
  max: number;
  used: number;
  /** 1 — відновлюється на довгому привалі («до світанку»); більше — вручну, коли минуть дні */
  days: number;
}

export interface SpellSlot {
  total: number;
  used: number;
}

export interface Spell {
  /** черновик после «Додати» — ещё не подтверждён */
  draft?: boolean;
  id: string;
  level: number; // 0..9
  name: string;
  prepared: boolean;
  text: string;
}

export interface WeaponStats {
  /** кубик шкоди, напр. '1d8' */
  dice: string;
  /** тип шкоди українською */
  type: string;
  /** властивості українською: легка, фехтувальна… */
  props: string[];
  finesse: boolean;
  ranged: boolean;
  /** кубик дворучного хвата (універсальна), '' — нет */
  versatile: string;
  /** дальність '80/320' или досяжність '10'; '' — нет */
  range: string;
  martial: boolean;
}

export type ArmorKind = 'light' | 'medium' | 'heavy' | 'shield';
export interface ArmorStats {
  kind: ArmorKind;
  /** базовый КО (у щита — +2) */
  base: number;
  /** предел бонуса Вправності: null — без предела, 0 — не добавляется */
  dexMax: number | null;
  strMin: number;
  stealthDis: boolean;
}

export interface Item {
  id: string;
  name: string;
  qty: number;
  text: string;
  magic: boolean;
  /** id записи библиотеки SRD, из которой создан предмет; null — свой предмет */
  ref: string | null;
  /** английское название (для предметов из библиотеки) */
  en: string;
  /** надето / в руках — только тогда действуют КО, бонусы и «значення стає N» */
  equipped: boolean;
  /** требует налаштування */
  attune: boolean;
  attuned: boolean;
  /** редкость: common | uncommon | rare | veryRare | legendary | artifact | varies | '' */
  rarity: string;
  weapon: WeaponStats | null;
  armor: ArmorStats | null;
  /** магический +N: к атаке и шкоде оружия или к КО доспеха/щита */
  bonus: number;
  /** +КО от не-доспеха (перстень захисту…) */
  acBonus: number;
  /** +к рятункам */
  saveBonus: number;
  /** «твоя Сила дорівнює 19» */
  setAbility: Ability | null;
  setValue: number;
  /** acBonus действует только без доспеха и щита (наручі захисту) */
  noArmor: boolean;
  /** ресурс с зарядами предмета */
  resourceId: string | null;
  /** колода карт предмета (Колода ілюзій тощо) — тянуть случайную карту */
  deckId: string | null;
  /** действия: выпить, использовать, потратить заряды */
  powers: ItemPower[];
  /** черновик после «Додати» — ещё не подтверждён; при загрузке такие выбрасываются */
  draft: boolean;
  /** пассивные модификаторы, пока предмет действует (надет/налаштований) */
  mods: ItemMod[];
  /** переключатели: «Запалити» (Вогняний язик), «Клацнути підборами» (Чоботи швидкості) */
  toggles: ItemToggle[];
  /** доп. урон зброї: завжди, проти виду істот або лише на критичному */
  extra: ExtraDamage[];
}

/** Доп. урон к атакам предметом. */
export interface ExtraDamage {
  id: string;
  dice: string;
  type: string;
  /** условие («проти драконів»); '' — завжди */
  when: string;
  /** только при критическом попадании */
  crit: boolean;
}

/** Переключатель предмета: пока включён — его модификаторы и доп. урон действуют. */
export interface ItemToggle {
  id: string;
  name: string;
  on: boolean;
  mods: ItemMod[];
  extra: ExtraDamage[];
  /** «10 хв на день», «4 год польоту» */
  note: string;
}

/** Временный эффект персонажа (выпитое зелье): действует, пока его не снимут. */
export interface ActiveEffect {
  id: string;
  name: string;
  /** откуда: «Зілля сили пагорбового велетня» */
  source: string;
  mods: ItemMod[];
  /** «1 година» — подсказка, игровое время не считаем */
  duration: string;
}

/**
 * Пассивный модификатор предмета. t — на что:
 * 'check' (всі перевірки), 'save', 'initiative', 'prof', 'spellAttack', 'spellDc', 'ac', 'acBase' (базовий КО без обладунку),
 * 'ability:str'…, 'speed', 'fly' | 'swim' | 'climb' (0 — дорівнює ходьбі), 'darkvision', 'hpMax' (за рівень — perLevel).
 * when — умова текстом: тоді число не рахується, а показується підказкою.
 */
export interface ItemMod {
  id: string;
  t: string;
  op: 'add' | 'set' | 'min' | 'mul';
  v: number;
  /** предел: «+2, але не вище 20» */
  cap: number | null;
  perLevel: boolean;
  when: string;
}

export interface Feature {
  id: string;
  name: string;
  text: string;
}

export interface Deck {
  id: string;
  name: string;
  cards: string[];
  /** индексы вытянутых карт */
  drawn: number[];
}

export interface Coins {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface Character {
  id: string;
  schema: 1;
  createdAt: string;
  updatedAt: string;

  // шапка
  name: string;
  className: string;
  level: number;
  race: string;
  background: string;
  alignment: string;
  xp: number;
  /** Опыт до следующего уровня (для полосы); 0 — не показывать полосу */
  xpNext: number;
  playerName: string;
  portraitId: string | null;

  abilities: Record<Ability, number>;
  profBonusOverride: number | null;
  saves: Record<Ability, SaveState>;
  skills: Record<SkillKey, SkillState>;
  passivePerception: Tweak;
  inspiration: boolean;

  // бой
  ac: number;
  acNote: string;
  /** КО считается от надетого снаряжения (иначе — число ac вручную) */
  acAuto: boolean;
  initiative: Tweak;
  speed: string;
  hp: { max: number; current: number; temp: number };
  hitDice: { die: string; total: number; used: number };
  deathSaves: { success: number; fail: number };
  attacks: Attack[];
  resources: Resource[];

  // тексты листа
  proficiencies: string;
  traits: { personality: string; ideals: string; bonds: string; flaws: string };
  features: Feature[];

  // снаряжение
  equipment: Item[];
  coins: Coins;
  decks: Deck[];

  // заклинания
  spellcasting: {
    enabled: boolean;
    className: string;
    ability: Ability;
    dcOverride: number | null;
    attackOverride: number | null;
    /** индекс 0 не используется, 1..9 — уровни */
    slots: SpellSlot[];
  };
  spells: Spell[];

  // страница «Персонаж»
  profile: {
    age: string;
    height: string;
    weight: string;
    eyes: string;
    skin: string;
    hair: string;
    appearance: string;
    backstory: string;
    allies: string;
    otherFeatures: string;
    treasure: string;
  };
  gallery: string[];
  secret: string;

  /** mech — версия разметки действий/зарядов из библиотеки (одноразовое обновление старых предметов) */
  rules: { rerollOnes: boolean; mech: number };
  /** временные эффекты (выпитые зелья) */
  effects: ActiveEffect[];
}

export interface CharacterSummary {
  id: string;
  name: string;
  className: string;
  level: number;
  portraitId: string | null;
  hp: { max: number; current: number };
  updatedAt: string;
}

export interface TranscriptSegment {
  id: string;
  /** ISO-время начала фрагмента */
  at: string;
  durationMs: number;
  text: string;
  audioId: string | null;
  status: 'pending' | 'done' | 'error' | 'none';
  sentToClaude: boolean;
}

export type EntryKind = 'session' | 'note';

export interface JournalEntry {
  id: string;
  characterId: string;
  kind: EntryKind;
  sessionNo: number | null;
  /** дата сессии YYYY-MM-DD */
  date: string;
  title: string;
  /** текст с упоминаниями вида @[Имя] */
  text: string;
  secret: string;
  pinned: boolean;
  images: string[];
  transcript: TranscriptSegment[];
  createdAt: string;
  updatedAt: string;
}

export type CodexKind = 'npc' | 'place' | 'quest';

export interface CodexEntry {
  id: string;
  characterId: string;
  kind: CodexKind;
  name: string;
  text: string;
  status: string;
  secret: string;
  images: string[];
  /** аватар — одна из images (как портрет персонажа); нет — буква на цвете типа */
  portraitId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaRecord {
  id: string;
  characterId: string;
  kind: 'image' | 'audio';
  mime: string;
  blob: Blob;
  createdAt: string;
}
