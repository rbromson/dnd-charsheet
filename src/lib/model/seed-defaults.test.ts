import { describe, it, expect } from 'vitest';
import { fridoCommoner, fridoVampire } from './seed-defaults';
import { normalizeCharacter } from './normalize';
import { attackBonus, attackSaveDc, initiative, passivePerception, profBonus, resolveDamageFormula, saveBonus, skillBonus, spellAttack, spellDC } from '../rules/calc';

const byName = (c: ReturnType<typeof fridoCommoner>['character'], n: string) => c.attacks.find((a) => a.name === n)!;

describe('Фрідо, Простолюдин 1 — цифри як у листі', () => {
  const c = normalizeCharacter(fridoCommoner().character);
  it('бонуси й рятунки', () => {
    expect(profBonus(c)).toBe(2);
    expect(saveBonus(c, 'str')).toBe(1);
    expect(saveBonus(c, 'con')).toBe(4);
    expect(saveBonus(c, 'dex')).toBe(2);
    expect(skillBonus(c, 'insight')).toBe(4);
    expect(skillBonus(c, 'animalHandling')).toBe(4);
    expect(skillBonus(c, 'persuasion')).toBe(4);
    expect(skillBonus(c, 'athletics')).toBe(-1);
    expect(passivePerception(c)).toBe(12);
    expect(initiative(c)).toBe(2);
  });
  it('атаки', () => {
    expect(attackBonus(c, byName(c, 'Кинджал'))).toBe(4);
    expect(resolveDamageFormula(c, byName(c, 'Кинджал'))).toBe('1d4+2');
    expect(attackBonus(c, byName(c, 'Пательня'))).toBe(1);
    expect(resolveDamageFormula(c, byName(c, 'Пательня'))).toBe('1d4-1');
    expect(attackBonus(c, byName(c, 'Легкий арбалет'))).toBe(2);
    expect(attackSaveDc(c, byName(c, 'Злісна насмішка'))).toBe(12);
    expect(spellDC(c)).toBe(12);
  });
  it('зброя пов’язана з предметами', () => {
    for (const n of ['Кинджал', 'Пательня', 'Легкий арбалет']) {
      const a = byName(c, n);
      expect(c.equipment.find((i) => i.id === a.itemId)?.name).toBe(n);
    }
  });
});

describe('Фрідо-вампір 5', () => {
  const c = normalizeCharacter(fridoVampire().character);
  it('рахується від бонусу +3 і Харизми', () => {
    expect(profBonus(c)).toBe(3);
    expect(saveBonus(c, 'con')).toBe(5);
    expect(saveBonus(c, 'cha')).toBe(5);
    expect(skillBonus(c, 'stealth')).toBe(5);
    expect(skillBonus(c, 'deception')).toBe(5);
    expect(attackBonus(c, byName(c, 'Укус'))).toBe(5);
    expect(resolveDamageFormula(c, byName(c, 'Укус'))).toBe('1d6+2');
    expect(attackBonus(c, byName(c, 'Пательня'))).toBe(2);
    expect(spellDC(c)).toBe(13);
    expect(spellAttack(c)).toBe(5);
  });
});

describe('спорядження Фрідо пов’язане з бібліотекою', () => {
  it('зброя, обладунок і колода мають ref та англійську назву', () => {
    for (const s of [fridoCommoner(), fridoVampire()]) {
      const byName = (n: string) => s.character.equipment.find((i) => i.name === n)!;
      expect(byName('Кинджал').ref).toBe('dagger');
      expect(byName('Кинджал').weapon?.dice).toBe('1d4');
      expect(byName('Пательня').ref).toBe('club');
      expect(byName('Легкий арбалет').weapon?.ranged).toBe(true);
      expect(byName('Шкіряний обладунок').armor).toMatchObject({ kind: 'light', base: 11 });
      expect(byName('Колода ілюзій').en).toBe('Deck of Illusions');
    }
    // КО у листах вручну — бібліотека його не змінює
    expect(fridoCommoner().character.ac).toBe(13);
  });
});
