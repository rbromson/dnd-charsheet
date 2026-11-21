// @vitest-environment node
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, importManifest } from './backup';
import { putCharacter, putJournal, putMediaRecord, allCharacters, byCharacter } from './db';
import { fridoSeed } from './model/seed-frido';

describe('backup', () => {
  it('round-trips into a new character with fresh ids', async () => {
    const c = fridoSeed().character;
    c.portraitId = 'img1';
    c.gallery = ['img1'];
    await putCharacter(c);
    await putMediaRecord({ id: 'img1', characterId: c.id, kind: 'image', mime: 'image/png', blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), createdAt: '' });
    await putMediaRecord({ id: 'aud1', characterId: c.id, kind: 'audio', mime: 'audio/wav', blob: new Blob([new Uint8Array([9])], { type: 'audio/wav' }), createdAt: '' });
    await putJournal({
      id: 'j1', characterId: c.id, kind: 'session', sessionNo: 1, date: '2026-11-21', title: 'S1', text: '@[Бруно] тут', secret: '', pinned: false,
      images: ['img1'], transcript: [{ id: 's1', at: '', durationMs: 1, text: 'hi', audioId: 'aud1', status: 'done', sentToClaude: false }], createdAt: '', updatedAt: '',
    });

    const { blob } = await buildBackup(c.id, { audio: false });
    const { manifest, blobs } = await parseBackup(blob);
    expect(manifest.character.name).toBe('Фридо Брецель');
    expect(manifest.media.map((m) => m.kind)).toEqual(['image']);
    expect(blobs.size).toBe(1);

    const imported = await importManifest(manifest, blobs);
    expect(imported.id).not.toBe(c.id);
    expect(imported.portraitId).not.toBe('img1');
    expect(imported.portraitId).toBeTruthy();
    expect((await allCharacters()).length).toBe(2);
    const j = await byCharacter('journal', imported.id);
    expect(j).toHaveLength(1);
    expect(j[0].images[0]).toBe(imported.portraitId);
    expect(j[0].transcript[0].audioId).toBeNull();
    // оригинал не тронут
    expect((await byCharacter('journal', c.id))[0].id).toBe('j1');
  });

  it('imports a bare character JSON', async () => {
    const c = fridoSeed().character;
    const { manifest, blobs } = await parseBackup(new Blob([JSON.stringify(c)]));
    const imported = await importManifest(manifest, blobs);
    expect(imported.name).toBe('Фридо Брецель');
  });
});
