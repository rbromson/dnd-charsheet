import { describe, it, expect } from 'vitest';
import { newCharacter } from '../model/defaults';
import { levelUp } from './levelup';
import { averageHp, hitDiceLeft, pools, regainHitDice } from './hitdice';
import { applyRest } from './rest';

describe('level up', () => {
  it('adds level, HP (die + Con, min 1), a hit die and the XP threshold', () => {
    const c = newCharacter();
    c.level = 3;
    c.xpNext = 2700;
    c.abilities.con = 14;
    c.hp = { max: 24, current: 20, temp: 0 };
    c.hitDice = { die: 'd8', total: 3, used: 1 };
    const r = levelUp(c, 'main', averageHp('d8'));
    expect(r).toEqual({ level: 4, hp: 7 });
    expect(c.hp).toEqual({ max: 31, current: 27, temp: 0 });
    expect(c.hitDice.total).toBe(4);
    expect(c.xpNext).toBe(6500);
  });
  it('multiclass: the chosen pool grows; a long rest gives back half, biggest dice first', () => {
    const c = newCharacter();
    c.hitDice = { die: 'd6', total: 2, used: 2 };
    c.hitDiceMore = [{ id: 'f', die: 'd10', total: 2, used: 2 }];
    levelUp(c, 'f', 6);
    expect(c.hitDiceMore[0].total).toBe(3);
    expect(pools(c).map((p) => p.die)).toEqual(['d6', 'd10']);
    expect(regainHitDice(c)).toBe(2);
    expect(c.hitDiceMore[0].used).toBe(0);
    expect(c.hitDice.used).toBe(2);
    applyRest(c, 'long');
    expect(hitDiceLeft(c)).toBe(5);
  });
});
