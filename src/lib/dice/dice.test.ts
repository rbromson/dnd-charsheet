import { describe, it, expect } from 'vitest';
import { seqRng, cryptoRng } from './rng';
import { parseFormula, rollFormula, formatFormula } from './formula';
import { rollD20, addDie } from './d20';

describe('rollD20', () => {
  it('reroll 1 then apply min 8', () => {
    const r = rollD20({ bonus: 4, minD20: 8, rerollOnes: true, rng: seqRng([1, 5]) });
    expect(r.dice[0]).toEqual({ face: 5, rerolledFrom: 1, value: 8, kept: true });
    expect(r.total).toBe(12);
    expect(r.natural).toBe(5);
    expect(r.crit).toBe(false);
  });
  it('without reroll a 1 is a fumble but min still applies', () => {
    const r = rollD20({ bonus: 4, minD20: 8, rng: seqRng([1]) });
    expect(r.fumble).toBe(true);
    expect(r.total).toBe(12);
  });
  it('advantage with two ones rerolls each once', () => {
    const r = rollD20({ bonus: 0, mode: 'adv', rerollOnes: true, rng: seqRng([1, 7, 1, 1]) });
    // первая: 1 → 7; вторая: 1 → 1 (только один переброс)
    expect(r.dice.map((d) => d.face)).toEqual([7, 1]);
    expect(r.total).toBe(7);
    expect(r.dice[0].kept).toBe(true);
  });
  it('disadvantage keeps lower', () => {
    const r = rollD20({ bonus: 2, mode: 'dis', rng: seqRng([15, 4]) });
    expect(r.total).toBe(6);
    expect(r.dice[1].kept).toBe(true);
  });
  it('crit on natural 20', () => {
    const r = rollD20({ bonus: 6, rng: seqRng([20]) });
    expect(r.crit).toBe(true);
    expect(r.total).toBe(26);
  });
  it('addDie adds resource die', () => {
    const r = addDie(rollD20({ bonus: 4, rng: seqRng([10]) }), 4, 'Кубики завзятості', seqRng([3]));
    expect(r.total).toBe(17);
    expect(r.extra).toEqual([{ sides: 4, value: 3, label: 'Кубики завзятості' }]);
  });
});

describe('formula', () => {
  it('parses tolerant input', () => {
    expect(parseFormula('1д6 + 3')).toEqual({ dice: [{ count: 1, sides: 6, sign: 1 }], flat: 3 });
    expect(parseFormula('2d8-1')).toEqual({ dice: [{ count: 2, sides: 8, sign: 1 }], flat: -1 });
    expect(parseFormula('d20')).toEqual({ dice: [{ count: 1, sides: 20, sign: 1 }], flat: 0 });
    expect(parseFormula('')).toEqual({ dice: [], flat: 0 });
    expect(parseFormula('абв')).toEqual({ dice: [], flat: 0 });
  });
  it('crit doubles dice, not modifier', () => {
    const r = rollFormula('1d6+3', { rng: seqRng([2, 5]), crit: true });
    expect(r.dice.map((d) => d.value)).toEqual([2, 5]);
    expect(r.total).toBe(10);
  });
  it('empty formula totals 0', () => {
    expect(rollFormula('', { rng: seqRng([]) }).total).toBe(0);
  });
  it('formats', () => {
    expect(formatFormula(parseFormula('1d6+3'), true)).toBe('2d6+3');
    expect(formatFormula(parseFormula(''))).toBe('0');
  });
  it('crypto rng in range', () => {
    for (let i = 0; i < 200; i++) {
      const v = cryptoRng(20);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(20);
    }
  });
});
