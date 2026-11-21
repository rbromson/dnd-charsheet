import { describe, it, expect } from 'vitest';
import { splitBalanced } from './layout';

describe('splitBalanced', () => {
  it('returns k empty groups for empty input', () => {
    expect(splitBalanced([], 3)).toEqual([[], [], []]);
  });
  it('one item per group when n <= k', () => {
    expect(splitBalanced([5, 1], 3)).toEqual([[0], [1], []]);
  });
  it('keeps order and covers all indices', () => {
    const g = splitBalanced([3, 3, 3, 3, 3, 3, 3, 3, 3, 3], 3);
    expect(g.flat()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(g.every((x) => x.length > 0)).toBe(true);
  });
  it('balances a heavy first item', () => {
    const g = splitBalanced([10, 2, 2, 2, 2, 2], 3);
    expect(g[0]).toEqual([0]);
    expect(g.flat()).toEqual([0, 1, 2, 3, 4, 5]);
    const sums = g.map((x) => x.reduce((s, i) => s + [10, 2, 2, 2, 2, 2][i], 0));
    expect(Math.max(...sums)).toBe(10);
  });
});
