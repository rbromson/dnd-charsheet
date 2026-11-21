import type { Character } from '../model/types';
import { defaultCharacters } from '../model/seed-defaults';
import { uid, nowIso } from '../model/ids';
import { allCharacters, byCharacter, deleteCharacterCascade, getMeta, putCharacter, putCodex, setMeta } from '../db';
import { putMedia } from './media';

/** Версия набора персонажей по умолчанию: при смене — новые персонажи добавляются один раз. */
export const SEED_KEY = 'seed:frido-v2';

async function seedImage(characterId: string, path: string): Promise<string | null> {
  try {
    const res = await fetch(import.meta.env.BASE_URL + path);
    if (!res.ok) return null;
    return await putMedia(characterId, await res.blob(), 'image');
  } catch {
    return null;
  }
}

/** Старый тестовый «Фридо, Commoner 5», если его ни разу не меняли и у него нет записей. */
async function isUntouchedOldSeed(c: Character): Promise<boolean> {
  if (c.name !== 'Фридо Брецель' || c.className !== 'Commoner' || c.level !== 5) return false;
  if (c.updatedAt !== c.createdAt) return false;
  const [j, x] = await Promise.all([byCharacter('journal', c.id), byCharacter('codex', c.id)]);
  return j.length === 0 && x.length === 0;
}

/**
 * Один раз создаёт персонажей по умолчанию (с портретами и довідником).
 * Возвращает id персонажа, которого стоит открыть, или null, если ничего не делали.
 */
export async function ensureDefaultCharacters(): Promise<string | null> {
  if (await getMeta<boolean>(SEED_KEY, false)) return null;
  for (const c of await allCharacters()) if (await isUntouchedOldSeed(c)) await deleteCharacterCascade(c.id);

  let first: string | null = null;
  for (const s of defaultCharacters()) {
    const c = s.character;
    const portrait = await seedImage(c.id, s.portrait);
    const extra: string[] = [];
    for (const g of s.gallery) {
      const id = await seedImage(c.id, g);
      if (id) extra.push(id);
    }
    c.portraitId = portrait;
    c.gallery = [...(portrait ? [portrait] : []), ...extra];
    await putCharacter(c);
    const now = nowIso();
    for (const e of s.codex) await putCodex({ ...e, id: uid(), characterId: c.id, createdAt: now, updatedAt: now });
    first ??= c.id;
  }
  await setMeta(SEED_KEY, true);
  return first;
}
