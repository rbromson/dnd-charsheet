import type { LibItem, LibSpell } from './types';

let itemsP: Promise<LibItem[]> | null = null;
let spellsP: Promise<LibSpell[]> | null = null;

/** Предметы SRD (ленивая загрузка — отдельный кусок сборки). */
export function loadItems(): Promise<LibItem[]> {
  itemsP ??= import('./data/items.json').then((m) => m.default as unknown as LibItem[]);
  return itemsP;
}
export function loadSpells(): Promise<LibSpell[]> {
  spellsP ??= import('./data/spells.json').then((m) => m.default as unknown as LibSpell[]);
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

export const RARITY_UK: Record<string, string> = {
  common: 'звичайний',
  uncommon: 'незвичайний',
  rare: 'рідкісний',
  veryRare: 'дуже рідкісний',
  legendary: 'легендарний',
  artifact: 'артефакт',
  varies: 'різна',
};

export const SRD_CREDIT =
  'Матеріали SRD 5.1 © Wizards of the Coast LLC, ліцензія CC-BY-4.0 (creativecommons.org/licenses/by/4.0). Переклад українською — для цього застосунку.';
