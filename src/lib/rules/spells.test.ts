import { describe, it, expect } from 'vitest';
import { newCharacter } from '../model/defaults';
import { castSpell, slotsLeft } from './spells';
import { spellFx } from '../library/spellfx';
import { armorClass } from './calc';

describe('casting from the spell card', () => {
  it('spends the chosen slot; refuses when none left', () => {
    const c = newCharacter();
    c.spellcasting.slots[1] = { total: 1, used: 0 };
    expect(castSpell(c, { name: 'Щит', slot: 1, conc: false, fx: null })).toBe(true);
    expect(slotsLeft(c, 1)).toBe(0);
    expect(castSpell(c, { name: 'Щит', slot: 1, conc: false, fx: null })).toBe(false);
  });
  it('shield on me raises AC by 5', () => {
    const c = newCharacter();
    c.acAuto = false;
    c.ac = 13;
    castSpell(c, { name: 'Щит', slot: 0, conc: false, fx: { mods: spellFx('shield'), duration: '1 раунд' } });
    expect(armorClass(c)).toBe(18);
  });
  it('a new concentration spell ends the old one and its effects', () => {
    const c = newCharacter();
    c.speed = '30';
    castSpell(c, { name: 'Прискорення', slot: 0, conc: true, fx: { mods: spellFx('haste'), duration: '' } });
    expect(c.concentration).toBe('Прискорення');
    expect(c.effects).toHaveLength(1);
    castSpell(c, { name: 'Благословення', slot: 0, conc: true, fx: null });
    expect(c.concentration).toBe('Благословення');
    expect(c.effects).toHaveLength(0);
  });
});
