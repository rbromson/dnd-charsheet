import type { LibItem, LibSpell } from './types';
import { lang } from '../i18n';

let itemsP: Promise<LibItem[]> | null = null;
let spellsP: Promise<LibSpell[]> | null = null;

/** Предметы SRD (ленивая загрузка — отдельный кусок сборки). */
export function loadItems(): Promise<LibItem[]> {
  itemsP ??= (lang === 'en' ? import('./data/items.en.json') : import('./data/items.json')).then((m) => m.default as unknown as LibItem[]);
  return itemsP;
}
export function loadSpells(): Promise<LibSpell[]> {
  spellsP ??= (lang === 'en' ? import('./data/spells.en.json') : import('./data/spells.json')).then(
    (m) => m.default as unknown as LibSpell[],
  );
  return spellsP;
}

/** Нормализация для поиска: регистр, апострофы, ё/є-подобные варианты. */
export function norm(s: string): string {
  return s.toLowerCase().replace(/[’'ʼ`]/g, '').replace(/ё/g, 'е').trim();
}

export function matches(q: string, ...fields: (string | undefined)[]): boolean {
  if (!q) return true;
  const n = norm(q);
  return fields.some((f) => f && norm(f).includes(n));
}

import { t } from '../i18n';

export const rarityText = (r: string | undefined): string => (r ? t(`lib.rarity.${r}`) : '');
