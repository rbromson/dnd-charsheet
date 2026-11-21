import { describe, it, expect } from 'vitest';
import { normalizeCharacter } from './normalize';
import { fridoSeed } from './seed-frido';

describe('normalizeCharacter', () => {
  it('fills missing fields from a partial document', () => {
    const c = normalizeCharacter({ name: 'X' });
    expect(c.name).toBe('X');
    expect(c.skills.deception.ability).toBe('cha');
    expect(c.hp.max).toBe(10);
    expect(c.spellcasting.slots).toHaveLength(10);
    expect(c.rules.rerollOnes).toBe(false);
  });

  it('keeps existing values and list items', () => {
    const { character } = fridoSeed();
    const c = normalizeCharacter(JSON.parse(JSON.stringify(character)));
    expect(c.skills.deception.ability).toBe('wis');
    expect(c.resources[0].maxPerRoll).toBe(3);
    expect(c.attacks[0].damage).toBe('1d6+МОД');
    expect(c.id).toBe(character.id);
  });

  it('survives garbage', () => {
    const c = normalizeCharacter({ abilities: { str: 'abc', dex: '14' }, attacks: [null, 5, { name: 'A' }], spellcasting: { slots: 'x' } });
    expect(c.abilities.str).toBe(10);
    expect(c.abilities.dex).toBe(14);
    expect(c.attacks).toHaveLength(1);
    expect(c.attacks[0].id).toBeTruthy();
    expect(c.spellcasting.slots[3]).toEqual({ total: 0, used: 0 });
    expect(normalizeCharacter(null).name).toBe('');
  });

  it('accepts null-able fields', () => {
    const c = normalizeCharacter({ profBonusOverride: 4, skills: { persuasion: { minD20: 8 } } });
    expect(c.profBonusOverride).toBe(4);
    expect(c.skills.persuasion.minD20).toBe(8);
    expect(c.skills.persuasion.ability).toBe('cha');
  });
});
