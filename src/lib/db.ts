import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Character, CodexEntry, JournalEntry, MediaRecord } from './model/types';

interface TavernaDB extends DBSchema {
  characters: { key: string; value: Character };
  journal: { key: string; value: JournalEntry; indexes: { characterId: string } };
  codex: { key: string; value: CodexEntry; indexes: { characterId: string } };
  media: { key: string; value: MediaRecord; indexes: { characterId: string } };
  meta: { key: string; value: { key: string; value: unknown } };
}

let dbp: Promise<IDBPDatabase<TavernaDB>> | null = null;

export function db(): Promise<IDBPDatabase<TavernaDB>> {
  if (!dbp) {
    dbp = openDB<TavernaDB>('taverna', 1, {
      upgrade(d) {
        d.createObjectStore('characters', { keyPath: 'id' });
        d.createObjectStore('journal', { keyPath: 'id' }).createIndex('characterId', 'characterId');
        d.createObjectStore('codex', { keyPath: 'id' }).createIndex('characterId', 'characterId');
        d.createObjectStore('media', { keyPath: 'id' }).createIndex('characterId', 'characterId');
        d.createObjectStore('meta', { keyPath: 'key' });
      },
    });
  }
  return dbp;
}

/** Только для тестов */
export function _resetDb() {
  dbp = null;
}

export async function getMeta<T>(key: string, fallback: T): Promise<T> {
  const r = await (await db()).get('meta', key);
  return r ? (r.value as T) : fallback;
}
export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await db()).put('meta', { key, value });
}

export async function allCharacters(): Promise<Character[]> {
  return (await db()).getAll('characters');
}
export async function putCharacter(c: Character): Promise<void> {
  await (await db()).put('characters', c);
}

export async function byCharacter<S extends 'journal' | 'codex' | 'media'>(store: S, characterId: string) {
  return (await db()).getAllFromIndex(store as 'journal', 'characterId', characterId) as unknown as Promise<TavernaDB[S]['value'][]>;
}
export async function putJournal(e: JournalEntry) {
  await (await db()).put('journal', e);
}
export async function putCodex(e: CodexEntry) {
  await (await db()).put('codex', e);
}
export async function deleteFrom(store: 'journal' | 'codex' | 'media' | 'characters', id: string) {
  await (await db()).delete(store, id);
}
export async function putMediaRecord(m: MediaRecord) {
  await (await db()).put('media', m);
}
export async function getMediaRecord(id: string) {
  return (await db()).get('media', id);
}

/** Удаляет персонажа со всем журналом, справочником и медиа. */
export async function deleteCharacterCascade(id: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(['characters', 'journal', 'codex', 'media'], 'readwrite');
  await tx.objectStore('characters').delete(id);
  for (const s of ['journal', 'codex', 'media'] as const) {
    const keys = await tx.objectStore(s).index('characterId').getAllKeys(id);
    for (const k of keys) await tx.objectStore(s).delete(k);
  }
  await tx.done;
}

export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
