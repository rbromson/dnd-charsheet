import { describe, it, expect } from 'vitest';
import { newCharacter } from '../model/defaults';
import { addLibItem } from '../library/apply';
import { ammoOf, spendAmmo } from './ammo';
import { attackExtras } from './calc';
import type { LibItem } from '../library/types';
import items from '../library/data/items.json';

const lib = (id: string) => (items as unknown as LibItem[]).find((e) => e.id === id)!;

describe('ammunition', () => {
  it('a bow finds its arrows (either order) and each shot spends one', () => {
    const c = newCharacter();
    c.attacks = [];
    addLibItem(c, lib('arrow'));
    addLibItem(c, lib('shortbow'));
    const bow = c.attacks.find((a) => a.name === 'Короткий лук')!;
    expect(ammoOf(c, bow)).toEqual({ name: 'Стріла', count: 20 });
    expect(spendAmmo(c, bow.id)).toBe(19);
    const c2 = newCharacter();
    c2.attacks = [];
    addLibItem(c2, lib('crossbow-light'));
    addLibItem(c2, lib('crossbow-bolt'));
    expect(ammoOf(c2, c2.attacks[0])?.count).toBe(20);
  });
  it('own extra dice on an attack: always vs a chip to pick', () => {
    const c = newCharacter();
    const a = c.attacks[0] ?? { id: 'x', name: 'Рапіра', ability: 'dex', prof: true, bonus: 0, override: null, damage: '1d8+МОД', damageType: '', note: '', itemId: null, save: null, saveDc: null, extra: [], ammoId: null };
    a.extra = [
      { id: '1', dice: '2d6', type: '', when: 'Скрита атака', crit: false },
      { id: '2', dice: '1d6', type: '', when: '', crit: false },
    ];
    const ex = attackExtras(c, a);
    expect(ex.options.map((x) => x.dice)).toEqual(['2d6']);
    expect(ex.always.map((x) => x.dice)).toEqual(['1d6']);
  });
});
