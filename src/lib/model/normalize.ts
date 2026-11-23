import type { ArmorStats, Attack, Character, CodexEntry, Deck, Feature, Item, JournalEntry, Resource, Spell, SpellSlot, WeaponStats } from './types';
import { newCharacter } from './defaults';
import { uid, nowIso, todayDate } from './ids';

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Blob);

/** Глубокое слияние: структура и типы — из defaults, значения — из raw, если тип подходит. */
export function mergeDefaults<T>(defaults: T, raw: unknown): T {
  if (isPlain(defaults)) {
    const src = isPlain(raw) ? raw : {};
    const out: Plain = {};
    for (const [k, dv] of Object.entries(defaults)) out[k] = mergeDefaults(dv, src[k]);
    return out as T;
  }
  if (Array.isArray(defaults)) return (Array.isArray(raw) ? raw : defaults) as T;
  if (raw === undefined) return defaults;
  if (defaults === null) return (raw === null || typeof raw === 'number' || typeof raw === 'string' ? raw : null) as T;
  if (typeof raw === typeof defaults) {
    if (typeof raw === 'number' && !Number.isFinite(raw)) return defaults;
    return raw as T;
  }
  // число, пришедшее строкой из старого импорта
  if (typeof defaults === 'number' && typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw) as T;
  return defaults;
}

const ATTACK: Attack = { id: '', name: '', ability: 'str', prof: true, bonus: 0, override: null, damage: '1d6+МОД', damageType: '', note: '', itemId: null, save: null, saveDc: null };
const RESOURCE: Resource = { id: '', name: '', max: 1, current: 1, die: null, recharge: 'long', maxPerRoll: null };
const SPELL: Spell = { id: '', level: 0, name: '', prepared: false, text: '' };
const ITEM: Item = {
  id: '', name: '', qty: 1, text: '', magic: false, ref: null, en: '', equipped: false, attune: false, attuned: false, rarity: '',
  weapon: null, armor: null, bonus: 0, acBonus: 0, saveBonus: 0, setAbility: null, setValue: 0, noArmor: false, resourceId: null, deckId: null,
};
const WEAPON: WeaponStats = { dice: '', type: '', props: [], finesse: false, ranged: false, versatile: '', range: '', martial: false };
const ARMOR: ArmorStats = { kind: 'light', base: 10, dexMax: null, strMin: 0, stealthDis: false };
const KINDS = ['light', 'medium', 'heavy', 'shield'];
const ABIL = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const FEATURE: Feature = { id: '', name: '', text: '' };
const DECK: Deck = { id: '', name: '', cards: [], drawn: [] };
const SLOT: SpellSlot = { total: 0, used: 0 };

function list<T extends { id: string }>(raw: unknown, tpl: T): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPlain).map((r) => {
    const v = mergeDefaults(tpl, r);
    if (!v.id) v.id = uid();
    return v;
  });
}

export function normalizeCharacter(raw: unknown): Character {
  const base = newCharacter();
  const c = mergeDefaults(base, raw);
  const r = isPlain(raw) ? raw : {};
  c.id = typeof r.id === 'string' && r.id ? r.id : base.id;
  c.schema = 1;
  c.attacks = list(r.attacks, ATTACK);
  c.resources = list(r.resources, RESOURCE);
  c.spells = list(r.spells, SPELL);
  c.equipment = list(r.equipment, ITEM);
  // вложенные объекты оружия/доспеха mergeDefaults не берёт (по умолчанию null) — переносим вручную
  const rawItems = Array.isArray(r.equipment) ? r.equipment.filter(isPlain) : [];
  c.equipment.forEach((it, i) => {
    const raw = rawItems[i] ?? {};
    it.weapon = isPlain(raw.weapon) ? mergeDefaults(WEAPON, raw.weapon) : null;
    it.armor = isPlain(raw.armor) ? mergeDefaults(ARMOR, raw.armor) : null;
    if (it.armor && !KINDS.includes(it.armor.kind)) it.armor.kind = 'light';
    if (it.setAbility && !ABIL.includes(it.setAbility)) it.setAbility = null;
  });
  c.features = list(r.features, FEATURE);
  c.decks = list(r.decks, DECK);
  // колода живёт у предмета: старые «отдельные» колоды привязываем к предмету с тем же именем или заводим предмет
  for (const d of c.decks) {
    if (c.equipment.some((it) => it.deckId === d.id)) continue;
    const key = d.name.trim().toLowerCase();
    const owner = c.equipment.find((it) => !it.deckId && key && it.name.trim().toLowerCase() === key);
    if (owner) owner.deckId = d.id;
    else c.equipment.push({ ...ITEM, id: uid(), name: d.name, magic: true, deckId: d.id });
  }
  for (const it of c.equipment) if (it.deckId && !c.decks.some((d) => d.id === it.deckId)) it.deckId = null;
  const sc = isPlain(r.spellcasting) ? r.spellcasting : {};
  const slots = Array.isArray(sc.slots) ? sc.slots : [];
  c.spellcasting.slots = Array.from({ length: 10 }, (_, i) => mergeDefaults(SLOT, slots[i]));
  c.gallery = Array.isArray(r.gallery) ? r.gallery.filter((x): x is string => typeof x === 'string') : [];
  return c;
}

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Запись журнала с недостающими полями (старые копии, ответ ИИ, ручной импорт) — значения по умолчанию. */
export function normalizeEntry(input: Partial<JournalEntry> | null | undefined): JournalEntry {
  const raw = (input ?? {}) as Partial<JournalEntry>;
  const now = nowIso();
  return {
    ...raw,
    id: str(raw.id, uid()),
    characterId: str(raw.characterId),
    kind: raw.kind === 'note' ? 'note' : 'session',
    sessionNo: typeof raw.sessionNo === 'number' ? raw.sessionNo : null,
    date: str(raw.date, todayDate()),
    title: str(raw.title),
    text: str(raw.text),
    secret: str(raw.secret),
    pinned: raw.pinned === true,
    images: strArr(raw.images),
    transcript: Array.isArray(raw.transcript) ? raw.transcript : [],
    createdAt: str(raw.createdAt, now),
    updatedAt: str(raw.updatedAt, now),
  };
}

/** Запись довідника с недостающими полями — значения по умолчанию. */
export function normalizeCodex(input: Partial<CodexEntry> | null | undefined): CodexEntry {
  const raw = (input ?? {}) as Partial<CodexEntry>;
  const now = nowIso();
  return {
    ...raw,
    id: str(raw.id, uid()),
    characterId: str(raw.characterId),
    kind: raw.kind === 'place' || raw.kind === 'quest' ? raw.kind : 'npc',
    name: str(raw.name),
    text: str(raw.text),
    status: str(raw.status),
    secret: str(raw.secret),
    images: strArr(raw.images),
    portraitId: typeof raw.portraitId === 'string' ? raw.portraitId : null,
    createdAt: str(raw.createdAt, now),
    updatedAt: str(raw.updatedAt, now),
  };
}
