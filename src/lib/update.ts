/**
 * «Оновлення персонажа» від ШІ: після гри гравець наговорює нотатки, ШІ розкладає їх по категоріях
 * і повертає JSON у форматі нижче. Застосунок показує план змін, гравець відмічає потрібне — і застосовує.
 *
 * Формат (усі поля необов’язкові):
 * {
 *   "taverna": "update", "version": 1,
 *   "journal": { "title": "…", "sessionNo": 3, "date": "2026-11-22", "text": "події, @[Ім’я] для згадок" },
 *   "items":   [ { "action": "add" | "remove" | "set", "name": "…", "qty": 1, "text": "…", "magic": false } ],
 *   "coins":   { "cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0 },   // зміна: + отримав, − витратив
 *   "xp": 300,                                                    // отриманий досвід
 *   "hp": 12,                                                     // поточні ОЗ наприкінці (або null)
 *   "codex":   [ { "kind": "npc" | "place" | "quest", "name": "…", "text": "що дізналися", "status": "…" } ],
 *   "notes":   [ "що не лягло в категорії" ]
 * }
 */
import type { Character, CodexEntry, CodexKind, JournalEntry } from './model/types';
import { newItem } from './model/defaults';
import { addLibItem } from './library/apply';
import type { LibItem } from './library/types';
import { removeItem } from './rules/weapons';
import { norm } from './library';

export type CoinKey = 'cp' | 'sp' | 'ep' | 'gp' | 'pp';
const COINS: CoinKey[] = ['cp', 'sp', 'ep', 'gp', 'pp'];
/** «remove» і синоніми, які ШІ іноді пише замість нього (англ. та укр.) */
const REMOVE_RE = /^(remove|del|lost|los|used|use|spent|spend|sold|sell|gave|give|consum|drop|broke|−|-|прибра|видал|втрат|загуб|продав|прода|використ|витрат|віддав|відда|зламав)/;
const KINDS: CodexKind[] = ['npc', 'place', 'quest'];

export interface CharacterUpdate {
  journal: { title: string; sessionNo: number | null; date: string; text: string } | null;
  items: { action: 'add' | 'remove' | 'set'; name: string; qty: number; text: string; magic: boolean }[];
  coins: Record<CoinKey, number>;
  xp: number;
  hp: number | null;
  codex: { kind: CodexKind; name: string; text: string; status: string }[];
  notes: string[];
}

export type Op =
  | { id: string; type: 'journal'; title: string; sessionNo: number | null; date: string; text: string }
  | { id: string; type: 'item-add'; name: string; qty: number; text: string; magic: boolean; existingId: string | null; libId: string | null }
  | { id: string; type: 'item-remove'; name: string; qty: number; existingId: string | null; have: number }
  | { id: string; type: 'item-set'; name: string; qty: number; existingId: string | null }
  | { id: string; type: 'coins'; delta: Record<CoinKey, number>; short: CoinKey[] }
  | { id: string; type: 'xp'; delta: number }
  | { id: string; type: 'hp'; value: number; max: number }
  | { id: string; type: 'codex'; kind: CodexKind; name: string; text: string; status: string; existingId: string | null };

/** Достаёт JSON из ответа ШІ: чистий JSON, блок ```json … ``` або текст навколо. */
export function extractJson(text: string): unknown {
  const s = text.trim();
  try {
    return JSON.parse(s);
  } catch {
    /* шукаємо далі */
  }
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      /* далі */
    }
  }
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(s.slice(a, b + 1));
  throw new Error('no json');
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const num = (v: unknown, d = 0): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.').replace('−', '-')) : NaN;
  return Number.isFinite(n) ? Math.round(n) : d;
};
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** Нормалізує сирий об’єкт від ШІ (рядки замість чисел, пропущені поля, синоніми дій). */
export function parseUpdate(raw: unknown): CharacterUpdate {
  const r = obj(raw);
  const j = obj(r.journal);
  const jText = str(j.text);
  const journal =
    jText || str(j.title)
      ? { title: str(j.title), sessionNo: j.sessionNo == null || j.sessionNo === '' ? null : num(j.sessionNo, 0) || null, date: /^\d{4}-\d{2}-\d{2}$/.test(str(j.date)) ? str(j.date) : '', text: jText }
      : null;
  const items = arr(r.items)
    .map(obj)
    .map((i) => {
      const a = str(i.action).toLowerCase();
      const action: 'add' | 'remove' | 'set' = REMOVE_RE.test(a) ? 'remove' : /^(set|=)/.test(a) ? 'set' : 'add';
      return { action, name: str(i.name), qty: Math.max(0, num(i.qty, 1)), text: str(i.text ?? i.description), magic: i.magic === true };
    })
    .filter((i) => i.name);
  const c = obj(r.coins);
  const coins = Object.fromEntries(COINS.map((k) => [k, num(c[k], 0)])) as Record<CoinKey, number>;
  const codex = arr(r.codex)
    .map(obj)
    .map((x) => ({ kind: (KINDS.includes(str(x.kind) as CodexKind) ? str(x.kind) : 'npc') as CodexKind, name: str(x.name), text: str(x.text), status: str(x.status) }))
    .filter((x) => x.name);
  return {
    journal,
    items,
    coins,
    xp: Math.max(0, num(r.xp, 0)),
    hp: r.hp == null || r.hp === '' ? null : num(r.hp, 0),
    codex,
    notes: arr(r.notes).map(str).filter(Boolean),
  };
}

function findItem(c: Character, name: string) {
  const n = norm(name);
  return c.equipment.find((i) => norm(i.name) === n || (i.en && norm(i.en) === n));
}

/** План змін для попереднього перегляду. Нічого не змінює. */
export function planUpdate(c: Character, codexItems: CodexEntry[], u: CharacterUpdate, lib: LibItem[] = []): Op[] {
  const ops: Op[] = [];
  let k = 0;
  const id = () => `op${k++}`;
  if (u.journal || u.notes.length) {
    const notes = u.notes.length ? `\n\n${u.notes.map((n) => `— ${n}`).join('\n')}` : '';
    ops.push({ id: id(), type: 'journal', title: u.journal?.title ?? '', sessionNo: u.journal?.sessionNo ?? null, date: u.journal?.date ?? '', text: (u.journal?.text ?? '') + notes });
  }
  for (const i of u.items) {
    const ex = findItem(c, i.name);
    if (i.action === 'remove') ops.push({ id: id(), type: 'item-remove', name: ex?.name ?? i.name, qty: i.qty || 1, existingId: ex?.id ?? null, have: ex?.qty ?? 0 });
    else if (i.action === 'set') ops.push({ id: id(), type: 'item-set', name: ex?.name ?? i.name, qty: i.qty, existingId: ex?.id ?? null });
    else {
      const n = norm(i.name);
      let le = ex ? undefined : lib.find((e) => norm(e.n) === n || norm(e.en) === n);
      // «Potion of Healing» — описание-родитель: берём первый конкретный вариант
      if (le?.par) le = lib.find((e) => e.of === le!.id);
      ops.push({ id: id(), type: 'item-add', name: ex?.name ?? le?.n ?? i.name, qty: i.qty || 1, text: i.text, magic: i.magic, existingId: ex?.id ?? null, libId: le?.id ?? null });
    }
  }
  if (COINS.some((x) => u.coins[x])) {
    const short = COINS.filter((x) => c.coins[x] + u.coins[x] < 0);
    ops.push({ id: id(), type: 'coins', delta: u.coins, short });
  }
  if (u.xp) ops.push({ id: id(), type: 'xp', delta: u.xp });
  if (u.hp != null) ops.push({ id: id(), type: 'hp', value: Math.max(0, Math.min(c.hp.max, u.hp)), max: c.hp.max });
  for (const x of u.codex) {
    const n = x.name.toLowerCase();
    const ex = codexItems.find((e) => e.name.toLowerCase() === n);
    ops.push({ id: id(), type: 'codex', kind: ex?.kind ?? x.kind, name: ex?.name ?? x.name, text: x.text, status: x.status, existingId: ex?.id ?? null });
  }
  return ops;
}

export interface ApplyCtx {
  character: Character;
  lib: LibItem[];
  createJournal: (init: Partial<JournalEntry>) => void;
  createCodex: (kind: CodexKind, name: string, init: Partial<CodexEntry>) => void;
  updateCodex: (id: string, patch: Partial<CodexEntry>) => void;
  getCodex: (id: string) => CodexEntry | undefined;
}

/** Застосовує вибрані зміни. Мутує персонажа; журнал і довідник — через колбеки сторів. */
export function applyOps(ops: Op[], ctx: ApplyCtx): void {
  const c = ctx.character;
  for (const op of ops) {
    switch (op.type) {
      case 'journal': {
        const init: Partial<JournalEntry> = { title: op.title, text: op.text };
        if (op.date) init.date = op.date;
        if (op.sessionNo) init.sessionNo = op.sessionNo;
        ctx.createJournal(init);
        break;
      }
      case 'item-add': {
        // ищем и среди только что добавленных: ШІ мог назвать один предмет двумя именами
        const ex =
          (op.existingId ? c.equipment.find((i) => i.id === op.existingId) : undefined) ??
          (op.libId ? c.equipment.find((i) => i.ref === op.libId) : undefined) ??
          findItem(c, op.name);
        if (ex) {
          ex.qty += op.qty;
          if (op.text && !ex.text.includes(op.text)) ex.text = ex.text ? `${ex.text}\n\n${op.text}` : op.text;
          break;
        }
        const le = op.libId ? ctx.lib.find((e) => e.id === op.libId) : undefined;
        if (le) {
          const it = addLibItem(c, le);
          it.qty = op.qty;
          if (op.text) it.text = it.text ? `${op.text}\n\n${it.text}` : op.text;
        } else c.equipment.push(newItem({ name: op.name, qty: op.qty, text: op.text, magic: op.magic }));
        break;
      }
      case 'item-remove': {
        const ex = op.existingId ? c.equipment.find((i) => i.id === op.existingId) : undefined;
        if (!ex) break;
        if (ex.qty - op.qty <= 0) removeItem(c, ex.id);
        else ex.qty -= op.qty;
        break;
      }
      case 'item-set': {
        const ex = op.existingId ? c.equipment.find((i) => i.id === op.existingId) : undefined;
        if (ex) ex.qty = op.qty;
        else c.equipment.push(newItem({ name: op.name, qty: op.qty }));
        break;
      }
      case 'coins':
        for (const k of COINS) c.coins[k] = Math.max(0, c.coins[k] + op.delta[k]);
        break;
      case 'xp':
        c.xp += op.delta;
        break;
      case 'hp':
        c.hp.current = op.value;
        break;
      case 'codex': {
        const ex = op.existingId ? ctx.getCodex(op.existingId) : undefined;
        if (ex) {
          const patch: Partial<CodexEntry> = {};
          if (op.text && !ex.text.includes(op.text)) patch.text = ex.text ? `${ex.text}\n\n${op.text}` : op.text;
          if (op.status) patch.status = op.status;
          ctx.updateCodex(ex.id, patch);
        } else ctx.createCodex(op.kind, op.name, { text: op.text, ...(op.status ? { status: op.status } : {}) });
        break;
      }
    }
  }
}
