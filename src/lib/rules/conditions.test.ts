import { describe, it, expect } from 'vitest';
import { newCharacter } from '../model/defaults';
import { autoMode, concentrationDc, rollEffects } from './conditions';
import { walkSpeed } from './calc';
import { applyRest } from './rest';

describe('conditions', () => {
  it('poisoned: disadvantage on attacks and checks, not saves', () => {
    const c = newCharacter();
    c.conditions = ['poisoned'];
    expect(autoMode(rollEffects(c, 'attack'))).toBe('dis');
    expect(autoMode(rollEffects(c, 'skill'))).toBe('dis');
    expect(autoMode(rollEffects(c, 'save', 'con'))).toBe('normal');
  });
  it('invisible and prone cancel out on an attack', () => {
    const c = newCharacter();
    c.conditions = ['invisible', 'prone'];
    expect(autoMode(rollEffects(c, 'attack'))).toBe('normal');
  });
  it('restrained: Dex saves at disadvantage, speed 0; stunned auto-fails Str/Dex saves', () => {
    const c = newCharacter();
    c.speed = '30';
    c.conditions = ['restrained'];
    expect(autoMode(rollEffects(c, 'save', 'dex'))).toBe('dis');
    expect(walkSpeed(c).value).toBe(0);
    c.conditions = ['stunned'];
    expect(rollEffects(c, 'save', 'str').autoFail).toEqual(['stunned']);
  });
  it('exhaustion levels stack and a long rest removes one', () => {
    const c = newCharacter();
    c.speed = '30';
    c.exhaustion = 3;
    expect(autoMode(rollEffects(c, 'ability'))).toBe('dis');
    expect(autoMode(rollEffects(c, 'save', 'wis'))).toBe('dis');
    expect(walkSpeed(c).value).toBe(15);
    c.concentration = 'Благословення';
    applyRest(c, 'long');
    expect(c.exhaustion).toBe(2);
    expect(c.concentration).toBeNull();
  });
  it('concentration DC is 10 or half the damage', () => {
    expect(concentrationDc(7)).toBe(10);
    expect(concentrationDc(30)).toBe(15);
  });
});
