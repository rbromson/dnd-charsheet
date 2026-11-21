import type { Deck } from '../../lib/model/types';
import type { Rng } from '../../lib/dice/rng';

/** Индексы карт, которые ещё в колоде. */
export function remainingIndices(deck: Pick<Deck, 'cards' | 'drawn'>): number[] {
  const drawn = new Set(deck.drawn);
  const out: number[] = [];
  for (let i = 0; i < deck.cards.length; i++) if (!drawn.has(i)) out.push(i);
  return out;
}

/** Случайный индекс невытянутой карты или null, если колода пуста. */
export function drawIndex(deck: Pick<Deck, 'cards' | 'drawn'>, rng: Rng): number | null {
  const rest = remainingIndices(deck);
  if (!rest.length) return null;
  return rest[rng(rest.length) - 1];
}

/** Текст «одна карта на строку» → список карт (пустые строки отбрасываются). */
export function parseCards(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function sameCards(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
