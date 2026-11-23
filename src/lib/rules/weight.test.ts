import { describe, it, expect } from 'vitest';
import { newCharacter } from '../model/defaults';
import { addLibItem } from '../library/apply';
import { capacity, carried } from './weight';
import type { LibItem } from '../library/types';
import items from '../library/data/items.json';

const lib = (id: string) => (items as unknown as LibItem[]).find((e) => e.id === id)!;

describe('weight', () => {
  it('sums items (arrows per piece) and coins; capacity is Str × 15', () => {
    const c = newCharacter();
    c.equipment = [];
    c.coins = { cp: 0, sp: 0, ep: 0, gp: 50, pp: 0 };
    addLibItem(c, lib('arrow'));
    addLibItem(c, lib('longsword'));
    expect(carried(c)).toBe(1 + 3 + 1);
    c.abilities.str = 8;
    expect(capacity(c)).toBe(120);
  });
});
