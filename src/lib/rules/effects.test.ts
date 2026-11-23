import { describe, it, expect } from 'vitest';
import { newCharacter, newItem } from '../model/defaults';
import type { Attack } from '../model/types';
import { extraFor, potionEffect, togglesFor } from '../library/effects';
import { abilityScore, attackExtras, fullDamageFormula, walkSpeed } from './calc';
import { applyRest } from './rest';

const atk = (itemId: string): Attack => ({ id: 'a', name: 'Меч', ability: 'str', prof: true, bonus: 0, override: null, damage: '1d8+МОД', damageType: '', note: '', itemId, save: null, saveDc: null, extra: [], ammoId: null });

describe('switchable effects', () => {
  it('flame tongue adds 2d6 only while ignited', () => {
    const c = newCharacter();
    c.abilities.str = 10;
    c.equipment.push(newItem({ id: 'ft', name: 'Вогняний язик', toggles: togglesFor('m:flame-tongue'), attune: true, attuned: true }));
    expect(fullDamageFormula(c, atk('ft'))).toBe('1d8');
    c.equipment[0].toggles[0].on = true;
    expect(fullDamageFormula(c, atk('ft'))).toBe('1d8+2d6');
    c.equipment[0].attuned = false;
    expect(fullDamageFormula(c, atk('ft'))).toBe('1d8');
  });

  it('weapon extras: always, vs a creature type, and on a crit', () => {
    const c = newCharacter();
    c.abilities.str = 10;
    c.equipment.push(newItem({ id: 'fb', name: 'Морозне лезо', extra: extraFor('m:frost-brand'), attune: true, attuned: true }));
    c.equipment.push(newItem({ id: 'ds', name: 'Вбивця драконів', extra: extraFor('m:dragon-slayer') }));
    c.equipment.push(newItem({ id: 'vw', name: 'Жорстока зброя', extra: extraFor('m:vicious-weapon') }));
    expect(fullDamageFormula(c, atk('fb'))).toBe('1d8+1d6');
    expect(attackExtras(c, atk('ds')).options[0].dice).toBe('3d6');
    expect(attackExtras(c, atk('vw')).crit[0].dice).toBe('2d6');
  });

  it('boots of speed double speed while clicked', () => {
    const c = newCharacter();
    c.speed = '30';
    c.equipment.push(newItem({ id: 'b', name: 'Чоботи', toggles: togglesFor('m:boots-of-speed'), attune: true, attuned: true }));
    expect(walkSpeed(c).value).toBe(30);
    c.equipment[0].toggles[0].on = true;
    expect(walkSpeed(c).value).toBe(60);
  });

  it('a potion effect sets Strength until a long rest', () => {
    const c = newCharacter();
    c.abilities.str = 12;
    const fx = potionEffect('m:potion-of-giant-strength-hill', 'Зілля сили')!;
    c.effects.push({ id: 'e', source: 'Зілля сили', ...fx, conc: false });
    expect(abilityScore(c, 'str')).toBe(21);
    applyRest(c, 'long');
    expect(c.effects).toHaveLength(0);
    expect(abilityScore(c, 'str')).toBe(12);
  });
});
