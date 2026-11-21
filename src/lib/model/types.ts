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
}

export interface SpellSlot {
  total: number;
  used: number;
}

export interface Spell {
  id: string;
  level: number; // 0..9
  name: string;
  prepared: boolean;
  text: string;
}

export interface Item {
  id: string;
  name: string;
  qty: number;
  text: string;
  magic: boolean;
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

  rules: { rerollOnes: boolean };
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
