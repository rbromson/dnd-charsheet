import { describe, it, expect } from 'vitest';
import { extractJson, parseUpdate, planUpdate, applyOps, type Op } from './update';
import { buildUpdatePrompt } from './update-prompt';
import { fridoCommoner } from './model/seed-defaults';
import { normalizeCharacter } from './model/normalize';
import type { CodexEntry, CodexKind, JournalEntry } from './model/types';
import items from './library/data/items.json';
import type { LibItem } from './library/types';

const LIB = items as unknown as LibItem[];

function setup() {
  const s = fridoCommoner();
  const c = normalizeCharacter(s.character);
  const codex: CodexEntry[] = s.codex.map((e, i) => ({ ...e, id: `cx${i}`, characterId: c.id, createdAt: '', updatedAt: '' }));
  const journal: Partial<JournalEntry>[] = [];
  const ctx = {
    character: c,
    lib: LIB,
    createJournal: (init: Partial<JournalEntry>) => journal.push(init),
    createCodex: (kind: CodexKind, name: string, init: Partial<CodexEntry>) =>
      codex.push({ id: `new${codex.length}`, characterId: c.id, kind, name, text: '', status: '', secret: '', images: [], createdAt: '', updatedAt: '', ...init }),
    updateCodex: (id: string, patch: Partial<CodexEntry>) => Object.assign(codex.find((x) => x.id === id)!, patch),
    getCodex: (id: string) => codex.find((x) => x.id === id),
  };
  return { c, codex, journal, ctx };
}

const AI_ANSWER = `Ось результат:
\`\`\`json
{
  "taverna": "update", "version": 1,
  "journal": { "title": "Дорога до Бегафена", "sessionNo": "2", "date": "2026-11-22", "text": "Ми зустріли @[Мірра] біля @[Три підкови]." },
  "items": [
    { "action": "add", "name": "Кинджал", "qty": 1 },
    { "action": "add", "name": "Potion of Healing", "qty": 2 },
    { "action": "add", "name": "Зілля лікування", "qty": "2" },
    { "action": "sold", "name": "болти для арбалета", "qty": 5 },
    { "action": "remove", "name": "Мотузка", "qty": 1 },
    { "action": "add", "name": "Таємничий ключ", "qty": 1, "text": "Знайшли в льоху", "magic": false }
  ],
  "coins": { "gp": "15", "sp": -3 },
  "xp": 150,
  "hp": 7,
  "codex": [
    { "kind": "place", "name": "три підкови", "text": "Над дверима висить підкова", "status": "" },
    { "kind": "npc", "name": "Мірра", "text": "Корчмарка, знає Ложку", "status": "союзниця" }
  ],
  "notes": ["нерозбірливо: ім'я кузнеця"]
}
\`\`\`
Сподіваюся, допоміг!`;

describe('оновлення персонажа від ШІ', () => {
  it('дістає JSON з відповіді з текстом і блоком коду', () => {
    expect(extractJson(AI_ANSWER)).toHaveProperty('xp', 150);
    expect(extractJson('{"xp": 5}')).toEqual({ xp: 5 });
    expect(() => extractJson('нічого')).toThrow();
  });

  it('будує план: наявні предмети, бібліотека, нестача, відомі записи довідника', () => {
    const { c, codex } = setup();
    const ops = planUpdate(c, codex, parseUpdate(extractJson(AI_ANSWER)), LIB);
    const by = (type: Op['type']) => ops.filter((o) => o.type === type);
    expect(by('journal')).toHaveLength(1);
    const adds = by('item-add') as Extract<Op, { type: 'item-add' }>[];
    expect(adds.find((o) => o.name === 'Кинджал')?.existingId).toBeTruthy();
    expect(adds.find((o) => o.name === 'Зілля лікування')?.libId).toBe('m:potion-of-healing-common');
    const rem = by('item-remove') as Extract<Op, { type: 'item-remove' }>[];
    expect(rem.find((o) => o.name === 'Болти для арбалета')).toMatchObject({ qty: 5, have: 20 });
    expect(rem.find((o) => o.name === 'Мотузка')?.existingId).toBeNull();
    expect(by('coins')[0]).toMatchObject({ short: ['sp'] });
    const cx = by('codex') as Extract<Op, { type: 'codex' }>[];
    expect(cx.find((o) => o.name === 'Три підкови')?.existingId).toBe('cx1');
    expect(cx.find((o) => o.name === 'Мірра')?.existingId).toBeNull();
  });

  it('застосовує вибране', () => {
    const { c, codex, journal, ctx } = setup();
    const ops = planUpdate(c, codex, parseUpdate(extractJson(AI_ANSWER)), LIB);
    applyOps(ops, ctx);
    const item = (n: string) => c.equipment.find((i) => i.name === n);
    expect(item('Кинджал')?.qty).toBe(3);
    expect(item('Болти для арбалета')?.qty).toBe(15);
    expect(item('Таємничий ключ')).toMatchObject({ qty: 1, text: 'Знайшли в льоху' });
    // «Healing potion» і «Зілля лікування» — один предмет
    expect(c.equipment.filter((i) => i.ref === 'm:potion-of-healing-common')).toHaveLength(1);
    expect(c.equipment.find((i) => i.ref === 'm:potion-of-healing-common')?.qty).toBe(4);
    expect(c.coins).toMatchObject({ gp: 15, sp: 0 });
    expect(c.xp).toBe(150);
    expect(c.hp.current).toBe(7);
    expect(journal[0]).toMatchObject({ title: 'Дорога до Бегафена', sessionNo: 2, date: '2026-11-22' });
    expect(journal[0].text).toContain('нерозбірливо');
    expect(codex.find((x) => x.name === 'Три підкови')?.text).toContain('Над дверима');
    expect(codex.find((x) => x.name === 'Мірра')).toMatchObject({ kind: 'npc', status: 'союзниця' });
  });

  it('продаж усього прибирає предмет разом з атакою', () => {
    const { c, codex, ctx } = setup();
    const ops = planUpdate(c, codex, parseUpdate({ items: [{ action: 'remove', name: 'Легкий арбалет', qty: 1 }] }));
    applyOps(ops, ctx);
    expect(c.equipment.some((i) => i.name === 'Легкий арбалет')).toBe(false);
    expect(c.attacks.some((a) => a.name === 'Легкий арбалет')).toBe(false);
  });

  it('інструкція для ШІ містить формат, спорядження та відомі імена', () => {
    const { c, codex } = setup();
    const p = buildUpdatePrompt(c, codex, '', 'uk');
    expect(p).toContain('"taverna": "update"');
    expect(p).toContain('Болти для арбалета ×20');
    expect(p).toContain('Незнайомець у сірому плащі');
    expect(p).toContain('голосовому записі');
    expect(buildUpdatePrompt(c, codex, 'купили зілля', 'uk')).toContain('купили зілля');
  });
});
