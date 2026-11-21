import { describe, expect, it } from 'vitest';
import { rollD20, addDie } from '../../lib/dice/d20';
import { rollFormula } from '../../lib/dice/formula';
import { seqRng } from '../../lib/dice/rng';
import {
  joinParts,
  d20Parts,
  formulaParts,
  ruleChips,
  groupDice,
  historyValue,
  trayFormula,
  trayFormulaAscii,
  isSingleD20,
} from './format';
import type { RollEntry } from '../../lib/stores/dice.svelte';

describe('joinParts', () => {
  it('sign-aware with unicode minus', () => {
    expect(joinParts([{ label: 'd20', value: 8 }, { label: 'бонус', value: 4 }, { label: 'd4', value: 2 }], 14)).toBe(
      'd20 8 + бонус 4 + d4 2 = 14',
    );
    expect(joinParts([{ label: 'd20', value: 3 }, { label: 'бонус', value: -1 }], 2)).toBe('d20 3 − бонус 1 = 2');
    expect(joinParts([{ label: 'd6', value: 2 }, { label: '', value: -3 }], -1)).toBe('d6 2 − 3 = −1');
  });
  it('skips zero terms after the first', () => {
    expect(joinParts([{ label: 'd20', value: 5 }, { label: 'бонус', value: 0 }], 5)).toBe('d20 5 = 5');
  });
});

describe('d20 helpers', () => {
  it('breakdown uses kept die value and extra dice', () => {
    let r = rollD20({ bonus: 4, mode: 'adv', minD20: 8, rng: seqRng([1, 5]) });
    r = addDie(r, 4, 'Кубики завзятості', seqRng([2]));
    expect(joinParts(d20Parts(r, 'бонус'), r.total)).toBe('d20 8 + бонус 4 + d4 2 = 14');
  });
  it('rule chips: reroll, min, extra; kept first', () => {
    let r = rollD20({ bonus: 0, mode: 'normal', minD20: 8, rerollOnes: true, rng: seqRng([1, 5]) });
    r = addDie(r, 4, 'Завзятість', seqRng([3]));
    expect(ruleChips(r)).toEqual([
      { kind: 'reroll', from: 1, to: 5, kept: true },
      { kind: 'min', from: 5, to: 8, kept: true },
      { kind: 'extra', sides: 4, label: 'Завзятість', value: 3, kept: true },
    ]);
  });
});

describe('formula helpers', () => {
  it('groups dice and builds parts', () => {
    const r = rollFormula('2d6+1d8-2', { rng: seqRng([3, 4, 7]) });
    expect(groupDice(r)).toEqual([
      { sides: 6, sign: 1, values: [3, 4] },
      { sides: 8, sign: 1, values: [7] },
    ]);
    expect(joinParts(formulaParts(r), r.total)).toBe('d6 3 + d6 4 + d8 7 − 2 = 12');
  });
});

describe('historyValue', () => {
  const f = (formula: string, vals: number[]): RollEntry => ({
    id: 'x',
    at: 0,
    type: 'formula',
    label: formula,
    roll: rollFormula(formula, { rng: seqRng(vals) }),
  });
  it('multi d20 shows faces, otherwise total', () => {
    expect(historyValue(f('2d20', [7, 16]))).toBe('7, 16');
    expect(historyValue(f('1d6+3', [5]))).toBe('8');
    expect(historyValue(f('1d4-5', [1]))).toBe('−4');
  });
});

describe('tray formula', () => {
  it('builds in fixed order, defaults to 1d20', () => {
    expect(trayFormula({ 20: 2 }, 1)).toBe('2d20+1');
    expect(trayFormula({ 8: 1, 6: 2 }, -2)).toBe('2d6+1d8−2');
    expect(trayFormulaAscii({ 8: 1, 6: 2 }, -2)).toBe('2d6+1d8-2');
    expect(trayFormula({}, 0)).toBe('1d20');
  });
  it('single d20 detection', () => {
    expect(isSingleD20({})).toBe(true);
    expect(isSingleD20({ 20: 1 })).toBe(true);
    expect(isSingleD20({ 20: 2 })).toBe(false);
    expect(isSingleD20({ 20: 1, 4: 1 })).toBe(false);
  });
});
