import { describe, it, expect } from 'vitest';
import { fridoSeed } from '../model/seed-frido';
import {
  abilityMod, profBonusForLevel, profBonus, skillBonus, saveBonus, passivePerception, initiative,
  attackBonus, resolveDamageFormula, spellDC, spellAttack, fmt,
} from './calc';
import { applyDamage, applyHeal } from './hp';
import { applyRest, restPreview } from './rest';

const frido = () => fridoSeed().character;

describe('calc', () => {
  it('ability modifiers', () => {
    expect(abilityMod(8)).toBe(-1);
    expect(abilityMod(10)).toBe(0);
    expect(abilityMod(13)).toBe(1);
    expect(abilityMod(16)).toBe(3);
    expect(abilityMod(1)).toBe(-5);
    expect(abilityMod(30)).toBe(10);
  });
  it('proficiency bonus by level and override', () => {
    expect(profBonusForLevel(1)).toBe(2);
    expect(profBonusForLevel(4)).toBe(2);
    expect(profBonusForLevel(5)).toBe(3);
    expect(profBonusForLevel(17)).toBe(6);
    expect(profBonusForLevel(0)).toBe(2);
    const c = frido();
    expect(profBonus(c)).toBe(3);
    c.profBonusOverride = 4;
    expect(profBonus(c)).toBe(4);
  });
  it('skills of Frido', () => {
    const c = frido();
    expect(skillBonus(c, 'deception')).toBe(9); // Мдр +3, экспертиза 2×3
    expect(skillBonus(c, 'intimidation')).toBe(6);
    expect(skillBonus(c, 'persuasion')).toBe(4);
    expect(skillBonus(c, 'athletics')).toBe(-1);
    expect(passivePerception(c)).toBe(16);
    expect(initiative(c)).toBe(2);
  });
  it('extra bonus and override', () => {
    const c = frido();
    c.skills.stealth.bonus = 1;
    expect(skillBonus(c, 'stealth')).toBe(3);
    c.skills.stealth.override = 7;
    expect(skillBonus(c, 'stealth')).toBe(7);
    c.saves.con.bonus = 2;
    expect(saveBonus(c, 'con')).toBe(8);
    c.initiative.override = 5;
    expect(initiative(c)).toBe(5);
  });
  it('attacks and damage formula', () => {
    const c = frido();
    const pan = c.attacks[0];
    expect(attackBonus(c, pan)).toBe(6);
    expect(resolveDamageFormula(c, pan)).toBe('1d6+3');
    expect(resolveDamageFormula(c, { ...pan, ability: 'str' })).toBe('1d6-1');
    expect(resolveDamageFormula(c, { ...pan, damage: '1д6 + мод' })).toBe('1d6+3');
    expect(resolveDamageFormula(c, { ...pan, ability: 'int' })).toBe('1d6');
  });
  it('spellcasting', () => {
    const c = frido();
    c.spellcasting.ability = 'wis';
    expect(spellDC(c)).toBe(14);
    expect(spellAttack(c)).toBe(6);
    c.spellcasting.dcOverride = 15;
    expect(spellDC(c)).toBe(15);
  });
  it('fmt', () => {
    expect(fmt(3)).toBe('+3');
    expect(fmt(0)).toBe('+0');
    expect(fmt(-1)).toBe('−1');
  });
});

describe('hp', () => {
  it('damage takes temp first', () => {
    expect(applyDamage({ max: 43, current: 35, temp: 5 }, 8)).toEqual({ max: 43, current: 32, temp: 0 });
    expect(applyDamage({ max: 43, current: 35, temp: 10 }, 8)).toEqual({ max: 43, current: 35, temp: 2 });
  });
  it('overkill clamps to zero', () => {
    expect(applyDamage({ max: 43, current: 5, temp: 3 }, 100)).toEqual({ max: 43, current: 0, temp: 0 });
    expect(applyDamage({ max: 43, current: 5, temp: 0 }, -4)).toEqual({ max: 43, current: 5, temp: 0 });
  });
  it('heal caps at max', () => {
    expect(applyHeal({ max: 43, current: 40, temp: 2 }, 10)).toEqual({ max: 43, current: 43, temp: 2 });
  });
});

describe('rest', () => {
  it('short rest restores short resources only', () => {
    const c = frido();
    c.resources[0].current = 2;
    c.resources.push({ id: 'x', name: 'Long', max: 2, current: 0, die: null, recharge: 'long', maxPerRoll: null });
    c.hp.current = 10;
    applyRest(c, 'short');
    expect(c.resources[0].current).toBe(8);
    expect(c.resources[1].current).toBe(0);
    expect(c.hp.current).toBe(10);
  });
  it('long rest restores everything', () => {
    const c = frido();
    c.resources[0].current = 0;
    c.resources.push({ id: 'x', name: 'Long', max: 2, current: 0, die: null, recharge: 'long', maxPerRoll: null });
    c.resources.push({ id: 'y', name: 'Manual', max: 2, current: 0, die: null, recharge: 'manual', maxPerRoll: null });
    c.hp = { max: 43, current: 10, temp: 4 };
    c.hitDice.used = 4;
    c.deathSaves = { success: 1, fail: 2 };
    c.spellcasting.slots[1] = { total: 2, used: 2 };
    expect(restPreview(c, 'long').length).toBeGreaterThan(0);
    applyRest(c, 'long');
    expect(c.resources.map((r) => r.current)).toEqual([8, 2, 0]);
    expect(c.hp).toEqual({ max: 43, current: 43, temp: 0 });
    expect(c.hitDice.used).toBe(2);
    expect(c.deathSaves).toEqual({ success: 0, fail: 0 });
    expect(c.spellcasting.slots[1].used).toBe(0);
  });
});
