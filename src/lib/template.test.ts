import { describe, it, expect } from 'vitest';
import { buildTemplate } from './template';
import { normalizeCharacter } from './model/normalize';
import { skillBonus, attackBonus, resolveDamageFormula, attackSaveDc } from './rules/calc';

describe('шаблон для ШІ', () => {
  it('містить інструкції та всі поля листа', () => {
    const tpl = buildTemplate('uk');
    expect(Array.isArray(tpl._instructions)).toBe(true);
    expect(tpl).toHaveProperty('abilities');
    expect(tpl).toHaveProperty('skills.persuasion.prof', 0);
    expect(tpl).not.toHaveProperty('id');
    expect((tpl.spellcasting as { slots: unknown[] }).slots).toHaveLength(10);
  });

  it('заповнений ШІ шаблон читається як персонаж (зайве ігнорується, приклади не потрапляють)', () => {
    const filled = JSON.parse(JSON.stringify(buildTemplate('en')));
    filled.name = 'Aria';
    filled.level = 5;
    filled.abilities = { str: 10, dex: 18, con: 14, int: 12, wis: 13, cha: 8 };
    filled.skills.stealth.prof = 2;
    filled.attacks = [
      { name: 'Rapier', ability: 'dex', prof: true, bonus: 0, override: null, damage: '1d8+MOD', damageType: 'piercing', note: '', save: null, saveDc: null },
      { name: 'Vicious Mockery', ability: 'cha', prof: true, bonus: 0, override: null, damage: '2d4', damageType: 'psychic', note: '', save: 'wis', saveDc: null },
    ];
    filled.hp = { max: '38', current: 38, temp: 0 }; // число строкой — тоже ок
    const c = normalizeCharacter(filled);
    expect(c.name).toBe('Aria');
    expect(c.hp.max).toBe(38);
    expect(skillBonus(c, 'stealth')).toBe(4 + 6);
    expect(attackBonus(c, c.attacks[0])).toBe(7);
    expect(resolveDamageFormula(c, c.attacks[0])).toBe('1d8+4');
    expect(attackSaveDc(c, c.attacks[1])).toBe(8 + 3 - 1);
    expect(c.equipment).toHaveLength(0);
    expect((c as unknown as Record<string, unknown>)._instructions).toBeUndefined();
  });
});
