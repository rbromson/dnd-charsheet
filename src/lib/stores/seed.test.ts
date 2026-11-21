// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { ensureDefaultCharacters } from './seed';
import { allCharacters, byCharacter, putCharacter } from '../db';
import { fridoSeed } from '../model/seed-frido';

describe('персонажі за замовчуванням', () => {
  it('додаються один раз і прибирають незмінений старий тестовий лист', async () => {
    const old = fridoSeed().character;
    old.updatedAt = old.createdAt;
    await putCharacter(old);
    const first = await ensureDefaultCharacters();
    expect(first).toBeTruthy();
    const all = await allCharacters();
    expect(all.map((c) => c.className).sort()).toEqual(['Вампір (Тіньова рука)', 'Простолюдин (Трактирник)']);
    expect(await byCharacter('codex', first!)).toHaveLength(3);
    expect(await ensureDefaultCharacters()).toBeNull();
    expect(await allCharacters()).toHaveLength(2);
  });
});
