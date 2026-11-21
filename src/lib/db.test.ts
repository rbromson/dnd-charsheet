// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { allCharacters, putCharacter, putJournal, byCharacter, deleteCharacterCascade, putMediaRecord, getMeta, setMeta } from './db';
import { fridoSeed } from './model/seed-frido';
import type { JournalEntry } from './model/types';

const entry = (id: string, characterId: string): JournalEntry => ({
  id, characterId, kind: 'session', sessionNo: 1, date: '2026-11-21', title: 't', text: '', secret: '', pinned: false,
  images: [], transcript: [], createdAt: '', updatedAt: '',
});

describe('db', () => {
  it('stores characters, journal and cascades delete', async () => {
    const c = fridoSeed().character;
    await putCharacter(c);
    await putJournal(entry('j1', c.id));
    await putJournal(entry('j2', 'other'));
    await putMediaRecord({ id: 'm1', characterId: c.id, kind: 'image', mime: 'image/png', blob: new Blob(['x']), createdAt: '' });
    expect((await allCharacters()).map((x) => x.name)).toContain('Фридо Брецель');
    expect((await byCharacter('journal', c.id)).map((x) => x.id)).toEqual(['j1']);
    await deleteCharacterCascade(c.id);
    expect(await allCharacters()).toHaveLength(0);
    expect(await byCharacter('journal', c.id)).toHaveLength(0);
    expect(await byCharacter('media', c.id)).toHaveLength(0);
    expect(await byCharacter('journal', 'other')).toHaveLength(1);
  });
  it('meta', async () => {
    expect(await getMeta('x', 5)).toBe(5);
    await setMeta('x', 7);
    expect(await getMeta('x', 5)).toBe(7);
  });
});
