import { describe, it, expect } from 'vitest';
import items from './data/items.json';
import spells from './data/spells.json';
import type { LibItem, LibSpell } from './types';
import { addLibItem, fitsPick, spellAttack, spellDamageDice, spellFromLib } from './apply';
import { newCharacter } from '../model/defaults';
import { normalizeCharacter } from '../model/normalize';
import { abilityScore, acFromGear, armorClass, attackBonus, attunedCount, resolveDamageFormula, saveBonus, attackSaveDc } from '../rules/calc';
import { removeItem } from '../rules/weapons';

const I = items as unknown as LibItem[];
const S = spells as unknown as LibSpell[];
const item = (id: string) => I.find((x) => x.id === id)!;
const spell = (id: string) => S.find((x) => x.id === id)!;

function hero() {
  const c = newCharacter();
  c.abilities = { str: 16, dex: 14, con: 12, int: 10, wis: 10, cha: 8 };
  c.level = 5;
  return c;
}

describe('бібліотека SRD', () => {
  it('усе перекладено й має механіку', () => {
    expect(I.length).toBeGreaterThan(500);
    expect(S.length).toBeGreaterThan(300);
    expect(item('longsword').n).toBe('Довгий меч');
    expect(item('longsword').w).toMatchObject({ d: '1d8', dt: 'рубана', v: '1d10' });
    expect(item('m:ring-of-protection').x).toMatchObject({ ac: 1, sv: 1 });
    expect(item('m:gauntlets-of-ogre-power').x?.set).toEqual(['str', 19]);
    expect(item('m:wand-of-magic-missiles').x).toMatchObject({ ch: 7, rc: 'dawn' });
  });

  it('звичайна зброя стає атакою з кубиком і характеристикою', () => {
    const c = hero();
    const it = addLibItem(c, item('rapier'));
    const a = c.attacks.find((x) => x.itemId === it.id)!;
    expect(a.ability).toBe('str'); // Сила 16 > Вправність 14 — фехтувальна бере кращу
    expect(resolveDamageFormula(c, a)).toBe('1d8+3');
    expect(attackBonus(c, a)).toBe(6);
  });

  it('«Зброя +1» на основі довгого меча', () => {
    const c = hero();
    const e = item('m:weapon-1');
    expect(fitsPick(e.x!.pick!, item('longsword'))).toBe(true);
    expect(fitsPick(e.x!.pick!, item('plate-armor'))).toBe(false);
    const it = addLibItem(c, e, item('longsword'));
    expect(it.name).toBe('Довгий меч +1');
    const a = c.attacks.find((x) => x.itemId === it.id)!;
    expect(attackBonus(c, a)).toBe(7);
    expect(resolveDamageFormula(c, a)).toBe('1d8+3+1');
  });

  it('КО від спорядження: лати, щит, перстень захисту', () => {
    const c = hero();
    c.acAuto = true;
    expect(armorClass(c)).toBe(12); // 10 + Впр 2
    addLibItem(c, item('chain-shirt'));
    expect(armorClass(c)).toBe(15); // 13 + 2 (макс 2)
    addLibItem(c, item('shield'));
    expect(armorClass(c)).toBe(17);
    const ring = addLibItem(c, item('m:ring-of-protection'));
    expect(armorClass(c)).toBe(17); // не налаштований — не діє
    ring.attuned = true;
    expect(attunedCount(c)).toBe(1);
    expect(armorClass(c)).toBe(18);
    expect(saveBonus(c, 'dex')).toBe(3);
    expect(acFromGear(c).parts.map((p) => p.value)).toEqual([13, 2, 2, 1]);
  });

  it('рукавиці сили огра ставлять Силу 19, поки налаштовані', () => {
    const c = hero();
    const g = addLibItem(c, item('m:gauntlets-of-ogre-power'));
    expect(abilityScore(c, 'str')).toBe(16);
    g.attuned = true;
    expect(abilityScore(c, 'str')).toBe(19);
  });

  it('заряди стають ресурсом і зникають разом із предметом', () => {
    const c = hero();
    const w = addLibItem(c, item('m:wand-of-magic-missiles'));
    expect(c.resources).toHaveLength(1);
    expect(c.resources[0]).toMatchObject({ max: 7, recharge: 'long' });
    removeItem(c, w.id);
    expect(c.resources).toHaveLength(0);
  });

  it('предмет із бібліотеки переживає збереження', () => {
    const c = hero();
    addLibItem(c, item('m:weapon-2'), item('longbow'));
    const back = normalizeCharacter(JSON.parse(JSON.stringify(c)));
    expect(back.equipment[0].weapon).toMatchObject({ dice: '1d8', ranged: true });
    expect(back.equipment[0].bonus).toBe(2);
  });

  it('заклинання: текст, кубики заговору за рівнем, атака-рятунок', () => {
    const c = hero();
    c.spellcasting.ability = 'cha';
    expect(spellDamageDice(spell('fire-bolt'), 5)).toBe('2d10');
    expect(spellDamageDice(spell('fireball'), 5)).toBe('8d6');
    const sp = spellFromLib(spell('fireball'));
    expect(sp.level).toBe(3);
    expect(sp.text).toContain('Дальність: 150 фт');
    const a = spellAttack(c, spell('vicious-mockery'))!;
    expect(a.save).toBe('wis');
    expect(a.damage).toBe('2d4');
    expect(attackSaveDc(c, a)).toBe(8 + 3 - 1);
  });
});

describe('ручний КО', () => {
  it('додає бонуси налаштованих предметів', () => {
    const c = hero();
    c.ac = 13;
    const cloak = addLibItem(c, item('m:cloak-of-protection'));
    expect(armorClass(c)).toBe(13);
    cloak.attuned = true;
    expect(armorClass(c)).toBe(14);
  });
});
