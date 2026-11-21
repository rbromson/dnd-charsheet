import { describe, it, expect } from 'vitest';
import { drawIndex, parseCards, remainingIndices, sameCards } from './deck';
import { applyCoinDelta, totalInGp } from './coins';
import { seqRng } from '../../lib/dice/rng';

describe('deck', () => {
  const deck = { cards: ['a', 'b', 'c', 'd'], drawn: [1, 3] };
  it('remaining skips drawn', () => {
    expect(remainingIndices(deck)).toEqual([0, 2]);
  });
  it('draws only undrawn cards', () => {
    expect(drawIndex(deck, seqRng([1]))).toBe(0);
    expect(drawIndex(deck, seqRng([2]))).toBe(2);
  });
  it('returns null on empty deck', () => {
    expect(drawIndex({ cards: ['a'], drawn: [0] }, seqRng([1]))).toBeNull();
    expect(drawIndex({ cards: [], drawn: [] }, seqRng([1]))).toBeNull();
  });
  it('parses one card per line', () => {
    expect(parseCards(' Дракон \n\n  Гоблін\r\nЛіч ')).toEqual(['Дракон', 'Гоблін', 'Ліч']);
  });
  it('compares lists', () => {
    expect(sameCards(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(sameCards(['a'], ['a', 'b'])).toBe(false);
  });
});

describe('coins', () => {
  it('totals in gold', () => {
    expect(totalInGp({ cp: 5, sp: 3, ep: 1, gp: 12, pp: 1 })).toBe(22.85);
  });
  it('never goes below zero', () => {
    expect(applyCoinDelta(3, -5)).toBe(0);
    expect(applyCoinDelta(3, 4)).toBe(7);
  });
});
