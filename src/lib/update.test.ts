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

import { characterDigest, historyForPrompt } from './digest';

describe('історія персонажа для ШІ', () => {
  it('зведення містить лист, спорядження, довідник і журнал без розмітки згадок', () => {
    const { c, codex } = setup();
    const journal: JournalEntry[] = [
      { id: 'j1', characterId: c.id, kind: 'session', sessionNo: 1, date: '2026-11-21', title: 'Перша', text: 'Ми зустріли @[Незнайомець у сірому плащі].', secret: 'таємниця', pinned: false, images: [], transcript: [], createdAt: '1', updatedAt: '1' },
    ];
    const d = characterDigest(c, codex, journal, 'uk');
    expect(d).toContain('# Фрідо Брецель');
    expect(d).toContain('Болти для арбалета ×20');
    expect(d).toContain('**Три підкови**');
    expect(d).toContain('### Сесія 1 · 2026-11-21 · Перша');
    expect(d).toContain('Ми зустріли Незнайомець у сірому плащі.');
    expect(d).not.toContain('@[');
    expect(d).not.toContain('таємниця');
  });

  it('інструкція з історією просить не створювати дублікати', () => {
    const { c, codex } = setup();
    const h = historyForPrompt(codex, [], 'uk');
    const p = buildUpdatePrompt(c, codex, '', 'uk', h);
    expect(p).toContain('Не створюй дублікатів');
    expect(p).toContain('Побачити свій трактир');
    expect(historyForPrompt([], [], 'uk')).toBe('');
  });
});

describe('доповнити чи перезаписати', () => {
  const OLD = 'Трактир у Бегафені. Фрідо виграв на нього купчу, але ще жодного разу там не був.';
  const plan = (raw: unknown, journalEntries: JournalEntry[] = []) => {
    const s = setup();
    s.codex[1].text = OLD;
    const ops = planUpdate(s.c, s.codex, parseUpdate(raw), [], journalEntries);
    return { ...s, ops };
  };
  const cxOp = (ops: Op[]) => ops.find((o) => o.type === 'codex') as Extract<Op, { type: 'codex' }>;

  it('нова інформація — новим абзацом', () => {
    const { ops, ctx, codex } = plan({ codex: [{ kind: 'place', name: 'Три підкови', text: 'Над дверима висить підкова.' }] });
    expect(cxOp(ops).mode).toBe('append');
    applyOps(ops, ctx);
    expect(codex[1].text).toBe(`${OLD}\n\nНад дверима висить підкова.`);
  });

  it('явне replace — замінює опис', () => {
    const { ops, ctx, codex } = plan({ codex: [{ kind: 'place', name: 'Три підкови', text: 'Згорілий трактир.', mode: 'replace' }] });
    expect(cxOp(ops).mode).toBe('replace');
    applyOps(ops, ctx);
    expect(codex[1].text).toBe('Згорілий трактир.');
  });

  it('ШІ повернув повний текст зі старим — це перезапис, а не дубль', () => {
    const full = `${OLD} Над дверима висить підкова.`;
    const { ops, ctx, codex } = plan({ codex: [{ kind: 'place', name: 'Три підкови', text: full, mode: 'append' }] });
    expect(cxOp(ops).mode).toBe('replace');
    applyOps(ops, ctx);
    expect(codex[1].text).toBe(full);
    expect(codex[1].text.split('жодного разу').length).toBe(2);
  });

  it('нічого нового — опис не змінюється, статус оновлюється', () => {
    const { ops, ctx, codex } = plan({ codex: [{ kind: 'place', name: 'Три підкови', text: 'трактир у Бегафені', status: 'знайдено' }] });
    expect(cxOp(ops).mode).toBe('same');
    applyOps(ops, ctx);
    expect(codex[1]).toMatchObject({ text: OLD, status: 'знайдено' });
  });

  it('опис наявного предмета теж: доповнити або перезаписати', () => {
    const s = setup();
    const pan = s.c.equipment.find((i) => i.name === 'Пательня')!;
    const old = pan.text;
    applyOps(planUpdate(s.c, s.codex, parseUpdate({ items: [{ action: 'add', name: 'Пательня', qty: 0, text: 'Тепер з гравіюванням.' }] })), s.ctx);
    expect(pan.text).toBe(`${old}\n\nТепер з гравіюванням.`);
    expect(pan.qty).toBe(1);
    applyOps(planUpdate(s.c, s.codex, parseUpdate({ items: [{ action: 'add', name: 'Пательня', qty: 0, text: 'Нова пательня.', mode: 'replace' }] })), s.ctx);
    expect(pan.text).toBe('Нова пательня.');
  });

  it('сесія з тим самим номером дописується, а не дублюється', () => {
    const existing: JournalEntry = { id: 'j2', characterId: 'c', kind: 'session', sessionNo: 2, date: '2026-11-22', title: 'Дорога', text: 'Ми дісталися міста.', secret: '', pinned: false, images: [], transcript: [], createdAt: '', updatedAt: '' };
    const { ops } = plan({ journal: { sessionNo: 2, text: 'Увечері купили мотузку.' } }, [existing]);
    const j = ops.find((o) => o.type === 'journal') as Extract<Op, { type: 'journal' }>;
    expect(j).toMatchObject({ existingId: 'j2', mode: 'append' });
    const { ops: ops2 } = plan({ journal: { sessionNo: 2, text: 'Ми дісталися міста. Увечері купили мотузку.' } }, [existing]);
    expect((ops2.find((o) => o.type === 'journal') as Extract<Op, { type: 'journal' }>).mode).toBe('replace');
    const { ops: ops3 } = plan({ journal: { sessionNo: 7, text: 'Нова сесія.' } }, [existing]);
    expect((ops3.find((o) => o.type === 'journal') as Extract<Op, { type: 'journal' }>)).toMatchObject({ existingId: null, mode: 'new' });
  });
});

import { autoLink } from './update';

describe('посилання на NPC, місця й завдання', () => {
  it('autoLink обгортає відомі імена, не чіпаючи вже позначені й частини слів', () => {
    const names = ['Мірра', 'Три підкови', 'Бегафен'];
    expect(autoLink('Мірра працює в Три підкови.', names)).toBe('@[Мірра] працює в @[Три підкови].');
    expect(autoLink('Вже є @[Мірра] і Мірра.', names)).toBe('Вже є @[Мірра] і @[Мірра].');
    expect(autoLink('Бегафенський сир, Мірру бачили.', names)).toBe('Бегафенський сир, Мірру бачили.');
    expect(autoLink('', names)).toBe('');
  });

  it('у плані тексти довідника, предметів і журналу отримують посилання — і на нові записи з цього ж оновлення', () => {
    const s = setup();
    const ops = planUpdate(
      s.c,
      s.codex,
      parseUpdate({
        journal: { text: 'Говорили з Незнайомець у сірому плащі.' },
        items: [{ action: 'add', name: 'Лист', text: 'Від Мірра до Гордa', qty: 1 }],
        codex: [
          { kind: 'npc', name: 'Мірра', text: 'Корчмарка в Три підкови, знає Горд' },
          { kind: 'npc', name: 'Горд', text: 'Кузнець' },
          { kind: 'quest', name: 'Знайти кузнеця', text: 'Мірра просить знайти Горд' },
        ],
      }),
    );
    const j = ops.find((o) => o.type === 'journal') as Extract<Op, { type: 'journal' }>;
    expect(j.text).toBe('Говорили з @[Незнайомець у сірому плащі].');
    const mirra = ops.find((o) => o.type === 'codex' && o.name === 'Мірра') as Extract<Op, { type: 'codex' }>;
    expect(mirra.text).toBe('Корчмарка в @[Три підкови], знає @[Горд]');
    const quest = ops.find((o) => o.type === 'codex' && o.name === 'Знайти кузнеця') as Extract<Op, { type: 'codex' }>;
    expect(quest.text).toBe('@[Мірра] просить знайти @[Горд]');
    const item = ops.find((o) => o.type === 'item-add') as Extract<Op, { type: 'item-add' }>;
    expect(item.text).toBe('Від @[Мірра] до Гордa');
  });

  it('інструкція вимагає посилань скрізь і записів для нових імен', () => {
    const { c, codex } = setup();
    const p = buildUpdatePrompt(c, codex, '', 'uk');
    expect(p).toMatch(/СКРІЗЬ/);
    expect(p).toContain('називному відмінку');
    expect(buildUpdatePrompt(c, codex, '', 'en')).toMatch(/EVERYWHERE/);
  });
});
