import { describe, it, expect } from 'vitest';
import { newCharacter, newItem } from '../model/defaults';
import type { ItemPower } from '../model/types';
import { costRange, canUse, powerFormula, spendPower, regainCharges } from './powers';
import { applyRest } from './rest';
import { powersFor, CHARGES } from '../library/powers';
import type { LibItem } from '../library/types';

const P = (p: Partial<ItemPower>): ItemPower => ({
  id: 'p', name: 'x', cost: 0, costMax: null, consume: false, dice: '', extra: '', result: 'info', self: true, dc: null, save: null, note: '', ...p,
});

describe('item powers', () => {
  it('builds an upcast formula from extra dice', () => {
    const fb = P({ cost: 1, costMax: 3, dice: '8d6', extra: '1d6' });
    expect(powerFormula(fb, 1)).toBe('8d6');
    expect(powerFormula(fb, 3)).toBe('10d6');
    expect(powerFormula(P({ cost: 1, costMax: 3, dice: '3d4+3', extra: '1d4+1' }), 2)).toBe('3d4+3+1d4+1');
    expect(powerFormula(P({}), 1)).toBe('');
  });

  it('limits cost by charges and quantity', () => {
    const c = newCharacter();
    const it = newItem({ id: 'w', name: 'Жезл' });
    it.resourceId = 'r';
    c.equipment.push(it);
    c.resources.push({ id: 'r', name: 'Жезл', max: 7, current: 2, die: null, recharge: 'long', maxPerRoll: null, regain: '1d6+1', onEmpty: null });
    const fb = P({ cost: 1, costMax: 3, dice: '8d6', extra: '1d6' });
    expect(costRange(c, it, fb)).toEqual([1, 2]);
    expect(canUse(c, it, fb, 3)).toBe(false);
    const res = spendPower(c, 'w', fb, 2);
    expect(c.resources[0].current).toBe(0);
    expect(res.emptied?.id).toBe('r');
  });

  it('consumes and removes a used-up potion', () => {
    const c = newCharacter();
    const it = newItem({ id: 'p', name: 'Зілля', qty: 1 });
    c.equipment.push(it);
    const drink = P({ consume: true, cost: 1, dice: '2d4+2', result: 'heal' });
    expect(spendPower(c, 'p', drink, 1).usedUp).toBe(true);
    expect(c.equipment.find((x) => x.id === 'p')).toBeUndefined();
  });

  it('regains charges by formula, capped at max, on a long rest', () => {
    const c = newCharacter();
    c.resources.push({ id: 'r', name: 'Жезл', max: 7, current: 6, die: null, recharge: 'long', maxPerRoll: null, regain: '1d6+1', onEmpty: null });
    const rolls = applyRest(c, 'long');
    expect(c.resources[0].current).toBe(7);
    expect(rolls[0].got).toBe(1);
    const r = { ...c.resources[0], current: 0, regain: null };
    expect(regainCharges(r)).toBe(7);
  });
});

describe('library powers', () => {
  const lib = (id: string, extra: Partial<LibItem> = {}): LibItem => ({ id, n: 'x', en: 'x', c: 'magic', k: '', t: '', ...extra });
  it('potion of healing drinks for 2d4+2', () => {
    const [p] = powersFor(lib('m:potion-of-healing-common', { mc: 'potion' }));
    expect(p.consume).toBe(true);
    expect(p.dice).toBe('2d4+2');
    expect(p.result).toBe('heal');
  });
  it('wand of fireballs: 8d6, upcast, DC 15, crumbles on a 1', () => {
    const [p] = powersFor(lib('m:wand-of-fireballs', { x: { ch: 7, rc: 'dawn' } }));
    expect(p.costMax).toBe(3);
    expect(p.dc).toBe(15);
    expect(CHARGES['m:wand-of-fireballs']).toEqual({ rg: '1d6+1', empty: { die: 20, on: [1], kind: 'destroy', gain: '' } });
  });
  it('plain magic items get no actions; charged ones get «spend charges»', () => {
    expect(powersFor(lib('m:cloak-of-protection', { mc: 'wondrous' }))).toEqual([]);
    expect(powersFor(lib('m:gem-of-seeing', { x: { ch: 3 } }))[0].costMax).toBe(3);
  });
});
