import type { ActiveEffect, ArmorStats, Attack, Character, CodexEntry, Deck, ExtraDamage, Feature, Item, ItemMod, ItemPower, ItemToggle, JournalEntry, Resource, Risk, Spell, SpellSlot, WeaponStats } from './types';
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
const RESOURCE: Resource = { id: '', name: '', max: 1, current: 1, die: null, recharge: 'long', maxPerRoll: null, regain: null, onEmpty: null };
const RISK: Risk = { die: 20, on: [1], kind: 'destroy', gain: '' };
const POWER: ItemPower = { id: '', name: '', cost: 0, costMax: null, consume: false, dice: '', extra: '', result: 'info', self: true, dc: null, save: null, note: '', spell: null, level: 0, upcast: false, dcUser: false, attack: null, effect: null, uses: null };
const RISK_KINDS = ['destroy', 'mundane', 'partial', 'gain'];
const EXTRA: ExtraDamage = { id: '', dice: '', type: '', when: '', crit: false };
const TOGGLE: ItemToggle = { id: '', name: '', on: false, mods: [], extra: [], note: '' };
const EFFECT: ActiveEffect = { id: '', name: '', source: '', mods: [], duration: '' };
function mods(raw: unknown): ItemMod[] {
  return (Array.isArray(raw) ? raw.filter(isPlain) : []).map((m) => {
    const md = mergeDefaults(MOD, m);
    if (!md.id) md.id = uid();
    if (!['add', 'set', 'min', 'mul'].includes(md.op)) md.op = 'add';
    return md;
  });
}
function extras(raw: unknown): ExtraDamage[] {
  return (Array.isArray(raw) ? raw.filter(isPlain) : []).map((x) => {
    const e = mergeDefaults(EXTRA, x);
    if (!e.id) e.id = uid();
    return e;
  });
}
const MOD: ItemMod = { id: '', t: 'check', op: 'add', v: 0, cap: null, perLevel: false, when: '' };
const RESULTS = ['heal', 'temp', 'damage', 'info'];
const SPELL: Spell = { id: '', level: 0, name: '', prepared: false, text: '' };
const ITEM: Item = {
  id: '', name: '', qty: 1, text: '', magic: false, ref: null, en: '', equipped: false, attune: false, attuned: false, rarity: '',
  weapon: null, armor: null, bonus: 0, acBonus: 0, saveBonus: 0, setAbility: null, setValue: 0, noArmor: false, resourceId: null, deckId: null, powers: [], draft: false, mods: [], toggles: [], extra: [],
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
  // вложенный onEmpty mergeDefaults не берёт (по умолчанию null) — переносим вручную
  const rawRes = Array.isArray(r.resources) ? r.resources.filter(isPlain) : [];
  c.resources.forEach((res, i) => {
    const raw = rawRes[i] ?? {};
    res.onEmpty = isPlain(raw.onEmpty) ? mergeDefaults(RISK, raw.onEmpty) : null;
    if (res.onEmpty && !RISK_KINDS.includes(res.onEmpty.kind)) res.onEmpty.kind = 'destroy';
    if (res.onEmpty) res.onEmpty.on = res.onEmpty.on.filter((x) => typeof x === 'number');
  });
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
    it.powers = (Array.isArray(raw.powers) ? raw.powers.filter(isPlain) : []).map((p) => {
      const pw = mergeDefaults(POWER, p);
      if (!pw.id) pw.id = uid();
      if (!RESULTS.includes(pw.result)) pw.result = 'info';
      if (pw.save && !ABIL.includes(pw.save)) pw.save = null;
      return pw;
    });
    it.mods = mods(raw.mods);
    it.extra = extras(raw.extra);
    it.toggles = (Array.isArray(raw.toggles) ? raw.toggles.filter(isPlain) : []).map((tg) => {
      const x = mergeDefaults(TOGGLE, tg);
      if (!x.id) x.id = uid();
      x.mods = mods(tg.mods);
      x.extra = extras(tg.extra);
      return x;
    });
    // эффект зелья (вложенный объект) — вручную
    const rawPw = Array.isArray(raw.powers) ? raw.powers.filter(isPlain) : [];
    it.powers.forEach((pw, j) => {
      const e = rawPw[j]?.effect;
      pw.effect = isPlain(e) ? { name: typeof e.name === 'string' ? e.name : '', mods: mods(e.mods), duration: typeof e.duration === 'string' ? e.duration : '' } : null;
      const ru = rawPw[j]?.uses;
      const u = (isPlain(ru) ? ru : {}) as Record<string, unknown>;
      const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
      const max = num(u.max) ? Math.max(1, num(u.max)!) : 0;
      pw.uses = max ? { max, used: Math.min(max, Math.max(0, num(u.used) ?? 0)), days: Math.max(1, num(u.days) ?? 1) } : null;
    });
  });
  // черновики «Додати», які так і не підтвердили (закрили застосунок посеред картки)
  c.equipment = c.equipment.filter((it) => !it.draft);
  const rawSpells = Array.isArray(r.spells) ? r.spells.filter(isPlain) : [];
  const draftSpells = new Set(rawSpells.filter((s) => s.draft === true).map((s) => s.id));
  c.spells = c.spells.filter((s) => !draftSpells.has(s.id));
  c.effects = (Array.isArray(r.effects) ? r.effects.filter(isPlain) : []).map((e) => {
    const x = mergeDefaults(EFFECT, e);
    if (!x.id) x.id = uid();
    x.mods = mods(e.mods);
    return x;
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
