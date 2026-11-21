import { describe, it, expect } from 'vitest';
import { fridoSeed } from '../model/seed-frido';
import { linkedAttack, addWeaponAttack, removeWeaponAttack, removeItem, syncWeaponName } from './weapons';

describe('weapons', () => {
  it('Frido pan is linked to its attack', () => {
    const c = fridoSeed().character;
    const pan = c.equipment.find((x) => x.name === 'Сковорідка')!;
    expect(linkedAttack(c, pan.id)?.name).toBe('Сковорідка');
  });
  it('adds a linked attack once and removes it with the item', () => {
    const c = fridoSeed().character;
    c.equipment.push({ id: 'dag', name: 'Кинджал', qty: 1, text: '', magic: false });
    const a = addWeaponAttack(c, c.equipment[c.equipment.length - 1]);
    expect(a.itemId).toBe('dag');
    expect(a.name).toBe('Кинджал');
    addWeaponAttack(c, c.equipment[c.equipment.length - 1]);
    expect(c.attacks.filter((x) => x.itemId === 'dag')).toHaveLength(1);
    removeItem(c, 'dag');
    expect(c.equipment.find((x) => x.id === 'dag')).toBeUndefined();
    expect(linkedAttack(c, 'dag')).toBeUndefined();
    expect(c.attacks).toHaveLength(1);
  });
  it('links an existing unlinked attack with the same name instead of duplicating', () => {
    const c = fridoSeed().character;
    const pan = c.equipment.find((x) => x.name === 'Сковорідка')!;
    c.attacks[0].itemId = null; // как у персонажа, созданного до этой версии
    const a = addWeaponAttack(c, pan);
    expect(c.attacks).toHaveLength(1);
    expect(a.itemId).toBe(pan.id);
    expect(a.ability).toBe('wis');
  });
  it('syncs the attack name with the item and can unlink', () => {
    const c = fridoSeed().character;
    const pan = c.equipment.find((x) => x.name === 'Сковорідка')!;
    pan.name = 'Чавунна сковорідка';
    syncWeaponName(c, pan.id);
    expect(linkedAttack(c, pan.id)?.name).toBe('Чавунна сковорідка');
    removeWeaponAttack(c, pan.id);
    expect(c.attacks).toHaveLength(0);
    expect(c.equipment.some((x) => x.id === pan.id)).toBe(true);
  });
});
