import { describe, it, expect } from 'vitest';
import { expandSpecs, percentParts, PERCENT_LABELS, UNIT_LABELS } from './spec';

describe('d100 як два d10', () => {
  const show = (v: number) => {
    const { tens, units } = percentParts(v);
    return `${PERCENT_LABELS[tens]}+${UNIT_LABELS[units]}`;
  };
  it('десятки 00–90 і одиниці 0–9; «00»+«0» = 100', () => {
    expect(show(100)).toBe('00+0');
    expect(show(1)).toBe('00+1');
    expect(show(10)).toBe('10+0');
    expect(show(47)).toBe('40+7');
    expect(show(99)).toBe('90+9');
  });
  it('кожне значення 1–100 розкладається однозначно', () => {
    const seen = new Set<string>();
    for (let v = 1; v <= 100; v++) seen.add(show(v));
    expect(seen.size).toBe(100);
  });
  it('expandSpecs дає дві кості для d100 і одну для інших', () => {
    const phys = expandSpecs([{ sides: 20, value: 17 }, { sides: 100, value: 63 }]);
    expect(phys).toHaveLength(3);
    expect(phys[0]).toMatchObject({ sides: 20, face: 16, src: 0 });
    expect(phys[1]).toMatchObject({ sides: 10, face: 6, tone: 'wine', src: 1 });
    expect(phys[1].labels[phys[1].face]).toBe('60');
    expect(phys[2].labels[phys[2].face]).toBe('3');
  });
});
