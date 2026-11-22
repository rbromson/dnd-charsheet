import { describe, it, expect } from 'vitest';
import { expandSpecs, PERCENT_LABELS } from './spec';
import { rollFormula } from '../dice/formula';
import { seqRng } from '../dice/rng';

describe('d100 — процентна кістка', () => {
  it('показує лише десятки 00–90', () => {
    expect(PERCENT_LABELS).toEqual(['00', '10', '20', '30', '40', '50', '60', '70', '80', '90']);
    const phys = expandSpecs([{ sides: 100, value: 70 }]);
    expect(phys).toHaveLength(1);
    expect(phys[0]).toMatchObject({ sides: 10, tone: 'wine' });
    expect(phys[0].labels[phys[0].face]).toBe('70');
    expect(expandSpecs([{ sides: 100, value: 0 }])[0].labels[0]).toBe('00');
  });

  it('кидок d100 дає 0, 10 … 90; з d10 — 1…100', () => {
    for (let k = 1; k <= 10; k++) {
      const r = rollFormula('1d100', { rng: seqRng([k]) });
      expect(r.total).toBe((k - 1) * 10);
    }
    expect(rollFormula('1d100+1d10', { rng: seqRng([1, 10]) }).total).toBe(10); // 00 + 10
    expect(rollFormula('1d100+1d10', { rng: seqRng([10, 10]) }).total).toBe(100); // 90 + 10
    expect(rollFormula('1d100+1d10', { rng: seqRng([5, 7]) }).total).toBe(47);
  });

  it('звичайні кістки — одна на кидок', () => {
    expect(expandSpecs([{ sides: 20, value: 17 }])[0]).toMatchObject({ sides: 20, face: 16 });
  });
});
