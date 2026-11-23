import { describe, it, expect } from 'vitest';
import { newCharacter, newItem } from '../model/defaults';
import type { ItemPower } from '../model/types';
import { costRange, canUse, powerFormula, spendPower, regainCharges, spellCast } from './powers';
import type { LibSpell } from '../library/types';
import { applyRest } from './rest';
import { powersFor, CHARGES } from '../library/powers';
import type { LibItem } from '../library/types';

const P = (p: Partial<ItemPower>): ItemPower => ({
  id: 'p', name: 'x', cost: 0, costMax: null, consume: false, dice: '', extra: '', result: 'info', self: true, dc: null, save: null, note: '', spell: null, level: 0, upcast: false, dcUser: false, attack: null, effect: null, uses: null, ...p,
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
  it('wand of fireballs: the fireball spell at 3rd level, upcast, DC 15, crumbles on a 1', () => {
    const [p] = powersFor(lib('m:wand-of-fireballs', { x: { ch: 7, rc: 'dawn' } }));
    expect(p.spell).toBe('fireball');
    expect(p.level).toBe(3);
    expect(p.costMax).toBe(7);
    expect(p.upcast).toBe(true);
    expect(p.dc).toBe(15);
    expect(CHARGES['m:wand-of-fireballs']).toEqual({ rg: '1d6+1', empty: { die: 20, on: [1], kind: 'destroy', gain: '' } });
  });
  it('plain magic items get no actions; charged ones get «spend charges»', () => {
    expect(powersFor(lib('m:cloak-of-protection', { mc: 'wondrous' }))).toEqual([]);
    expect(powersFor(lib('m:gem-of-seeing', { x: { ch: 3 } }))[0].costMax).toBe(3);
  });
});

describe('spells from items', () => {
  const fireball: LibSpell = { id: 'fireball', n: 'Вогняна куля', en: 'Fireball', l: 3, sc: '', ct: '', rg: '', cp: '', du: '', cl: [], t: '', sv: 'dex', dm: { t: 'fire', s: { '3': '8d6', '4': '9d6', '5': '10d6' } } };
  const cure: LibSpell = { id: 'cure-wounds', n: 'Лікування ран', en: 'Cure Wounds', l: 1, sc: '', ct: '', rg: '', cp: '', du: '', cl: [], t: '', hl: { '1': '1d8+MOD', '2': '2d8+MOD' } };
  const lib = (id: string): LibItem => ({ id, n: 'x', en: 'x', c: 'magic', k: '', t: '', x: { ch: 10 } });

  it('upcasts the wand fireball by extra charges', () => {
    const c = newCharacter();
    const [p] = powersFor(lib('m:wand-of-fireballs'), [fireball]);
    expect(p.name).toBe('Вогняна куля');
    const cast = spellCast(c, p, 3, fireball);
    expect(cast.level).toBe(5);
    expect(cast.formula).toBe('10d6');
    expect(cast.dc).toBe(15);
    expect(cast.result).toBe('damage');
  });

  it('staff spells use your DC and spellcasting modifier for healing', () => {
    const c = newCharacter();
    c.spellcasting.enabled = true;
    c.spellcasting.ability = 'wis';
    c.abilities.wis = 16;
    const [p] = powersFor(lib('m:staff-of-healing'), [cure]);
    expect(p.dcUser).toBe(true);
    const cast = spellCast(c, p, 2, cure);
    expect(cast.formula).toBe('2d8+3');
    expect(cast.result).toBe('heal');
  });

  it('spell scrolls ask for a spell and carry the table DC and attack', () => {
    const [p] = powersFor({ id: 'm:spell-scroll-3rd', n: 'x', en: 'x', c: 'magic', mc: 'scroll', k: '', t: '' });
    expect(p.spell).toBe('');
    expect(p.level).toBe(3);
    expect(p.dc).toBe(15);
    expect(p.attack).toBe(7);
    expect(p.consume).toBe(true);
  });
});

describe('once a day', () => {
  const lib = (id: string, of?: string): LibItem => ({ id, n: id, en: id, c: 'magic', k: '', t: '', of }) as unknown as LibItem;

  it('blocks a daily power once used; a long rest brings back «until dawn» but not «7 days»', () => {
    const c = newCharacter();
    const it = newItem({ id: 'd', name: 'Кинджал отрути' });
    const venom = P({ id: 'v', dice: '2d10', result: 'damage', uses: { max: 1, used: 0, days: 1 } });
    const horn = P({ id: 'h', dice: '2d4+2', uses: { max: 1, used: 0, days: 7 } });
    it.powers = [venom, horn];
    c.equipment.push(it);
    expect(canUse(c, it, it.powers[0], 1)).toBe(true);
    spendPower(c, 'd', it.powers[0], 1);
    spendPower(c, 'd', it.powers[1], 1);
    expect(it.powers[0].uses?.used).toBe(1);
    expect(canUse(c, it, it.powers[0], 1)).toBe(false);
    expect(costRange(c, it, it.powers[0])[1]).toBe(0);
    applyRest(c, 'short');
    expect(it.powers[0].uses?.used).toBe(1);
    applyRest(c, 'long');
    expect(it.powers[0].uses?.used).toBe(0);
    expect(it.powers[1].uses?.used).toBe(1);
  });

  it('library: bag of tricks 3 per dawn via its parent; staff of charming keeps spells and adds the daily save', () => {
    const bag = powersFor(lib('m:bag-of-tricks-gray', 'm:bag-of-tricks'));
    expect(bag).toHaveLength(1);
    expect(bag[0].uses).toEqual({ max: 3, used: 0, days: 1 });
    expect(bag[0].dice).toBe('1d8');
    const staff = powersFor(lib('m:staff-of-charming'));
    expect(staff.filter((p) => p.spell)).toHaveLength(3);
    expect(staff.filter((p) => p.uses)).toHaveLength(1);
    const horn = powersFor(lib('m:horn-of-valhalla-iron', 'm:horn-of-valhalla'));
    expect(horn[0].uses?.days).toBe(7);
    expect(horn[0].dice).toBe('5d4+5');
  });
});
