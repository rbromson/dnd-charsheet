import { describe, it, expect } from 'vitest';
import { newCharacter, newItem } from '../model/defaults';
import { normalizeCharacter } from '../model/normalize';
import { adjustDamage, defenses } from './defense';
import { modsFor } from '../library/mods';
import { potionEffect } from '../library/effects';

describe('damage defenses', () => {
  it('halves on resistance, zeroes on immunity, doubles on vulnerability', () => {
    expect(adjustDamage(9, { resist: true, immune: false, vuln: false })).toBe(4);
    expect(adjustDamage(9, { resist: false, immune: true, vuln: false })).toBe(0);
    expect(adjustDamage(9, { resist: false, immune: false, vuln: true })).toBe(18);
    expect(adjustDamage(9, { resist: true, immune: false, vuln: true })).toBe(8);
    expect(adjustDamage(9, null)).toBe(9);
  });

  it('collects own defenses and those of worn items; an unworn ring does nothing', () => {
    const c = newCharacter();
    c.defenses = ['resist:poison'];
    const ring = newItem({ id: 'r', name: 'Перстень опору (вогонь)', magic: true, equipped: true });
    ring.mods = modsFor('m:ring-of-resistance-fire');
    const off = newItem({ id: 'o', name: 'Перстень тепла', magic: true, equipped: false });
    off.mods = modsFor('m:ring-of-warmth');
    c.equipment.push(ring, off);
    const d = defenses(c, 'own');
    expect(d.map((x) => x.type)).toEqual(['fire', 'poison']);
    expect(d[0].sources).toEqual(['Перстень опору (вогонь)']);
    expect(d[1].sources).toEqual(['own']);
  });

  it('potion of fire resistance gives a real resistance effect; dragon scale by color', () => {
    expect(potionEffect('m:potion-of-resistance-fire', 'x')?.mods[0].t).toBe('resist:fire');
    expect(modsFor('m:dragon-scale-mail-green')[0].t).toBe('resist:poison');
    expect(modsFor('m:armor-of-resistance')[0].t).toBe('resist:');
    expect(modsFor('m:periapt-of-proof-against-poison')[0].t).toBe('immune:poison');
  });

  it('normalize keeps only valid own defenses', () => {
    const c = normalizeCharacter({ ...newCharacter(), defenses: ['resist:fire', 'resist:fire', 'oops', 3] } as never);
    expect(c.defenses).toEqual(['resist:fire']);
  });
});
