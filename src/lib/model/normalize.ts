import type { Attack, Character, Deck, Feature, Item, Resource, Spell, SpellSlot } from './types';
import { newCharacter } from './defaults';
import { uid } from './ids';

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

const ATTACK: Attack = { id: '', name: '', ability: 'str', prof: true, bonus: 0, override: null, damage: '1d6+МОД', damageType: '', note: '' };
const RESOURCE: Resource = { id: '', name: '', max: 1, current: 1, die: null, recharge: 'long', maxPerRoll: null };
const SPELL: Spell = { id: '', level: 0, name: '', prepared: false, text: '' };
const ITEM: Item = { id: '', name: '', qty: 1, text: '', magic: false };
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
  c.features = list(r.features, FEATURE);
  c.decks = list(r.decks, DECK);
  const sc = isPlain(r.spellcasting) ? r.spellcasting : {};
  const slots = Array.isArray(sc.slots) ? sc.slots : [];
  c.spellcasting.slots = Array.from({ length: 10 }, (_, i) => mergeDefaults(SLOT, slots[i]));
  c.gallery = Array.isArray(r.gallery) ? r.gallery.filter((x): x is string => typeof x === 'string') : [];
  return c;
}
