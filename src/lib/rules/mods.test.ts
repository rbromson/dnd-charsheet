import { describe, it, expect } from 'vitest';
import { newCharacter, newItem } from '../model/defaults';
import { modsFor } from '../library/mods';
import { abilityScore, acFromGear, initiative, itemSenses, profBonus, skillBonus, spellAttack, spellDC, walkSpeed, itemHints } from './calc';

const withItem = (id: string, extra: Record<string, unknown> = {}) => {
  const c = newCharacter();
  const it = newItem({ id: 'i', name: id, mods: modsFor(id), equipped: true, ...extra });
  c.equipment.push(it);
  return c;
};

describe('passive item effects', () => {
  it('luckstone adds +1 to checks and initiative', () => {
    const c = newCharacter();
    const base = skillBonus(c, 'stealth');
    const ini = initiative(c);
    const l = withItem('m:stone-of-good-luck-luckstone');
    expect(skillBonus(l, 'stealth')).toBe(base + 1);
    expect(initiative(l)).toBe(ini + 1);
  });

  it('ioun stone raises an ability by 2 up to 20, and only while active', () => {
    const c = withItem('m:ioun-stone-of-agility', { attune: true, attuned: true });
    c.abilities.dex = 19;
    expect(abilityScore(c, 'dex')).toBe(20);
    c.abilities.dex = 14;
    expect(abilityScore(c, 'dex')).toBe(16);
    c.equipment[0].attuned = false;
    expect(abilityScore(c, 'dex')).toBe(14);
  });

  it('mastery stone adds to proficiency bonus', () => {
    const c = withItem('m:ioun-stone-of-mastery');
    expect(profBonus(c)).toBe(3);
  });

  it('robe of the archmagi: base AC 15 + Dex without armour, +2 spell DC and attack', () => {
    const c = withItem('m:robe-of-the-archmagi');
    c.abilities.dex = 14;
    expect(acFromGear(c).total).toBe(17);
    const plain = newCharacter();
    expect(spellDC(c)).toBe(spellDC(plain) + 2);
    expect(spellAttack(c)).toBe(spellAttack(plain) + 2);
  });

  it('boots of striding: speed at least 30; goggles: darkvision; hints stay out of numbers', () => {
    const c = withItem('m:boots-of-striding-and-springing');
    c.speed = '25';
    expect(walkSpeed(c).value).toBe(30);
    expect(itemHints(c).length).toBe(1);
    const g = withItem('m:goggles-of-night');
    expect(itemSenses(g)).toEqual([{ key: 'darkvision', v: 60, item: 'm:goggles-of-night' }]);
  });
});
