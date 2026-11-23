import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import type { Character, CodexEntry, JournalEntry, MediaRecord } from './model/types';
import { normalizeCharacter, normalizeEntry, normalizeCodex } from './model/normalize';
import { uid, nowIso, todayDate } from './model/ids';
import { db, byCharacter, putCharacter, putJournal, putCodex, putMediaRecord, setMeta } from './db';
import { charStore } from './stores/characters.svelte';
import { journal } from './stores/journal.svelte';
import { codex } from './stores/codex.svelte';

export interface BackupManifest {
  app: 'taverna';
  version: 1;
  exportedAt: string;
  character: Character;
  journal: JournalEntry[];
  codex: CodexEntry[];
  media: { id: string; kind: 'image' | 'audio'; mime: string; file: string }[];
}

const ext = (mime: string) =>
  ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/ogg': 'ogg' })[mime] ?? 'bin';

/** Собирает ZIP: character.json + media/<id>.<ext>. */
export async function buildBackup(characterId: string, opts: { audio: boolean }): Promise<{ blob: Blob; name: string }> {
  const character = normalizeCharacter(await (await db()).get('characters', characterId));
  const j = await byCharacter('journal', characterId);
  const cx = await byCharacter('codex', characterId);
  const media = (await byCharacter('media', characterId)).filter((m) => opts.audio || m.kind !== 'audio');
  const files: Record<string, Uint8Array> = {};
  const manifest: BackupManifest = { app: 'taverna', version: 1, exportedAt: nowIso(), character, journal: j, codex: cx, media: [] };
  for (const m of media) {
    const file = `media/${m.id}.${ext(m.mime)}`;
    files[file] = new Uint8Array(await m.blob.arrayBuffer());
    manifest.media.push({ id: m.id, kind: m.kind, mime: m.mime, file });
  }
  files['character.json'] = strToU8(JSON.stringify(manifest, null, 1));
  const zipped = zipSync(files, { level: 6 });
  const safe = (character.name || 'character').replace(/[^\p{L}\p{N}_-]+/gu, '_');
  return { blob: new Blob([zipped as BlobPart], { type: 'application/zip' }), name: `${safe}_${todayDate()}.zip` };
}

/** Экспорт через «Поделиться» (если есть), иначе скачивание. */
export async function exportCharacter(characterId: string, opts: { audio: boolean }): Promise<void> {
  await Promise.all([charStore.flush(), journal.flush(), codex.flush()]);
  const { blob, name } = await buildBackup(characterId, opts);
  const file = new File([blob], name, { type: 'application/zip' });
  await setMeta('lastBackupAt', nowIso());
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/** Разбирает файл резервной копии (ZIP или JSON) в манифест + блобы. */
export async function parseBackup(file: Blob): Promise<{ manifest: BackupManifest; blobs: Map<string, Blob> }> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const blobs = new Map<string, Blob>();
  let manifest: BackupManifest;
  if (buf[0] === 0x50 && buf[1] === 0x4b) {
    const files = unzipSync(buf);
    const json = files['character.json'];
    if (!json) throw new Error('character.json not found');
    manifest = JSON.parse(strFromU8(json));
    for (const m of manifest.media ?? []) {
      const data = files[m.file];
      if (data) blobs.set(m.id, new Blob([data as BlobPart], { type: m.mime }));
    }
  } else {
    const parsed = JSON.parse(new TextDecoder().decode(buf));
    // старый формат: просто лист персонажа или манифест без медиа
    manifest = parsed.app === 'taverna' ? parsed : { app: 'taverna', version: 1, exportedAt: '', character: parsed, journal: [], codex: [], media: [] };
  }
  return { manifest, blobs };
}

/**
 * Импорт всегда создаёт нового персонажа с новыми id (лист, журнал, справочник, медиа),
 * поэтому существующий персонаж с тем же id не затрагивается.
 */
export async function importManifest(manifest: BackupManifest, blobs: Map<string, Blob>): Promise<Character> {
  const c = normalizeCharacter(manifest.character);
  const newId = uid();
  const mediaMap = new Map<string, string>();
  for (const m of manifest.media ?? []) {
    const blob = blobs.get(m.id);
    if (!blob) continue;
    const id = uid();
    mediaMap.set(m.id, id);
    const rec: MediaRecord = { id, characterId: newId, kind: m.kind, mime: m.mime, blob, createdAt: nowIso() };
    await putMediaRecord(rec);
  }
  const mapId = (x: string | null) => (x ? (mediaMap.get(x) ?? null) : null);
  c.id = newId;
  c.portraitId = mapId(c.portraitId);
  c.gallery = c.gallery.map(mapId).filter((x): x is string => !!x);
  c.updatedAt = nowIso();
  await putCharacter(c);
  for (const raw of manifest.journal ?? []) {
    // недостающие поля (старые копии, ответ ИИ) — значениями по умолчанию, иначе запись падает при открытии
    const e = normalizeEntry(raw);
    await putJournal({
      ...e,
      id: uid(),
      characterId: newId,
      images: (e.images ?? []).map(mapId).filter((x): x is string => !!x),
      transcript: (e.transcript ?? []).map((s) => ({ ...s, audioId: mapId(s.audioId) })),
    });
  }
  for (const raw of manifest.codex ?? []) {
    const e = normalizeCodex(raw);
    await putCodex({ ...e, id: uid(), characterId: newId, images: (e.images ?? []).map(mapId).filter((x): x is string => !!x), portraitId: mapId(e.portraitId ?? null) });
  }
  return c;
}

export async function importBackupFile(file: Blob): Promise<Character> {
  const { manifest, blobs } = await parseBackup(file);
  return importManifest(manifest, blobs);
}
