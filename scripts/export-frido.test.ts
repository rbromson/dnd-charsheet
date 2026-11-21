// @vitest-environment node
/**
 * Собирает резервные копии обоих Фрідо (формат «Експорт у файл») в папку EXPORT_DIR:
 *   EXPORT_DIR=~/Downloads npx vitest run scripts/export-frido.test.ts
 * Без EXPORT_DIR тест пропускается (в CI ничего не пишет).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { fridoCommoner, fridoVampire, type SeedCharacter } from '../src/lib/model/seed-defaults';
import { normalizeCharacter } from '../src/lib/model/normalize';
import { uid, nowIso } from '../src/lib/model/ids';
import { parseBackup, type BackupManifest } from '../src/lib/backup';
import { buildTemplate } from '../src/lib/template';

const OUT = process.env.EXPORT_DIR;
const ASSETS = join(__dirname, 'seed-assets');

function pack(s: SeedCharacter): Uint8Array {
  const c = s.character;
  const files: Record<string, Uint8Array> = {};
  const media: BackupManifest['media'] = [];
  const addImage = (name: string) => {
    const id = uid();
    const file = `media/${id}.jpg`;
    files[file] = new Uint8Array(readFileSync(join(ASSETS, name)));
    media.push({ id, kind: 'image', mime: 'image/jpeg', file });
    return id;
  };
  c.portraitId = addImage(s.portrait);
  c.gallery = [c.portraitId, ...s.gallery.map(addImage)];
  const now = nowIso();
  const manifest: BackupManifest = {
    app: 'taverna',
    version: 1,
    exportedAt: now,
    character: normalizeCharacter(c),
    journal: [],
    codex: s.codex.map((e) => ({ ...e, id: uid(), characterId: c.id, createdAt: now, updatedAt: now })),
    media,
  };
  files['character.json'] = strToU8(JSON.stringify(manifest, null, 1));
  return zipSync(files, { level: 6 });
}

describe.skipIf(!OUT)('експорт Фрідо', () => {
  it('пише два zip-файли, які читаються імпортом', async () => {
    mkdirSync(OUT!, { recursive: true });
    const out = [
      ['Фрідо_Брецель_Простолюдин_1.zip', fridoCommoner()],
      ['Фрідо_Брецель_Вампір_5.zip', fridoVampire()],
    ] as const;
    for (const [name, s] of out) {
      const zip = pack(s);
      writeFileSync(join(OUT!, name), zip);
      expect(zip.length).toBeGreaterThan(100_000);
      const { manifest, blobs } = await parseBackup(new Blob([zip as BlobPart]));
      expect(manifest.character.name).toBe('Фрідо Брецель');
      expect(blobs.size).toBe(s.gallery.length + 1);
      expect(manifest.codex).toHaveLength(3);
    }
  });

  it('пише шаблони для ШІ', () => {
    writeFileSync(join(OUT!, 'taverna-shablon-personazha.json'), JSON.stringify(buildTemplate('uk'), null, 2));
    writeFileSync(join(OUT!, 'taverna-character-template.json'), JSON.stringify(buildTemplate('en'), null, 2));
  });
});
