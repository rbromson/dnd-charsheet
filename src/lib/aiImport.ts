/**
 * Відповідь ШІ на «Новий персонаж → Через ШІ» → маніфест для імпорту.
 * Приймає: повну резервну копію (app: 'taverna'), обгортку { character: {...} } або сам персонаж.
 * Порожній об'єкт, помилку чи будь-що без імені/характеристик/класу — відкидає (null).
 */
import type { Character } from './model/types';
import type { BackupManifest } from './backup';
import { extractJson } from './update';

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const looksLikeCharacter = (v: unknown): boolean => isObj(v) && !!(v.name || v.abilities || v.className);

export function manifestFromAiText(raw: string): BackupManifest | null {
  let data: unknown;
  try {
    data = extractJson(raw);
  } catch {
    return null;
  }
  if (!isObj(data)) return null;
  if (data.app === 'taverna') return looksLikeCharacter(data.character) ? (data as unknown as BackupManifest) : null;
  const ch = looksLikeCharacter(data) ? data : looksLikeCharacter(data.character) ? data.character : null;
  if (!ch) return null;
  return { app: 'taverna', version: 1, exportedAt: '', character: ch as unknown as Character, journal: [], codex: [], media: [] };
}
