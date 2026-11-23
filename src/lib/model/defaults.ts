import { ABILITIES, SKILLS, type Ability, type Character, type Item, type SkillKey, type SkillState, type SaveState } from './types';
import { uid } from './ids';

export function emptySkills(): Record<SkillKey, SkillState> {
  const out = {} as Record<SkillKey, SkillState>;
  for (const s of SKILLS) out[s.key] = { prof: 0, ability: s.ability, bonus: 0, override: null, minD20: null, note: '' };
  return out;
}

export function emptySaves(): Record<Ability, SaveState> {
  const out = {} as Record<Ability, SaveState>;
  for (const a of ABILITIES) out[a] = { prof: 0, bonus: 0, override: null };
  return out;
}

export function emptySlots() {
  return Array.from({ length: 10 }, () => ({ total: 0, used: 0 }));
}

export function newCharacter(): Character {
  const now = new Date().toISOString();
  return {
    id: uid(),
    schema: 1,
    createdAt: now,
    updatedAt: now,
    name: '',
    className: '',
    level: 1,
    race: '',
    background: '',
    alignment: '',
    xp: 0,
    xpNext: 300,
    playerName: '',
    portraitId: null,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    profBonusOverride: null,
    saves: emptySaves(),
    skills: emptySkills(),
    passivePerception: { bonus: 0, override: null },
    inspiration: false,
    ac: 10,
    acNote: '',
    acAuto: false,
    initiative: { bonus: 0, override: null },
    speed: '30',
    hp: { max: 10, current: 10, temp: 0 },
    hitDice: { die: 'd8', total: 1, used: 0 },
    deathSaves: { success: 0, fail: 0 },
    attacks: [],
    resources: [],
    proficiencies: '',
    traits: { personality: '', ideals: '', bonds: '', flaws: '' },
    features: [],
    equipment: [],
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    decks: [],
    spellcasting: { enabled: false, className: '', ability: 'int', dcOverride: null, attackOverride: null, slots: emptySlots() },
    spells: [],
    profile: { age: '', height: '', weight: '', eyes: '', skin: '', hair: '', appearance: '', backstory: '', allies: '', otherFeatures: '', treasure: '' },
    gallery: [],
    secret: '',
    rules: { rerollOnes: false, mech: 0 },
    effects: [],
    defenses: [],
    conditions: [],
    exhaustion: 0,
    concentration: null,
  };
}

/** Пустой предмет снаряжения с нужными полями. */
export function newItem(p: Partial<Item> & { name: string }): Item {
  return {
    id: uid(), qty: 1, text: '', magic: false, ref: null, en: '', equipped: false, attune: false, attuned: false, rarity: '',
    weapon: null, armor: null, bonus: 0, acBonus: 0, saveBonus: 0, setAbility: null, setValue: 0, noArmor: false, resourceId: null, deckId: null, powers: [], draft: false, mods: [], toggles: [], extra: [],
    ...p,
  };
}

/** Порог опыта для следующего уровня по таблице 5e (для полосы опыта). */
export const XP_TABLE = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
export function xpForNextLevel(level: number): number {
  return XP_TABLE[Math.min(Math.max(level, 1), 19)] ?? 0;
}
