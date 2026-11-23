/**
 * Действия предметов: цена (заряды / штуки), формула с усилением, списание, восстановление зарядов.
 * Чистые функции — мутируют персонажа (вызывать внутри charStore.update).
 */
import type { Character, Item, ItemPower, Resource } from '../model/types';
import { rollFormula } from '../dice/formula';
import { cryptoRng } from '../dice/rng';
import { removeItem } from './weapons';
import { uid } from '../model/ids';
import type { LibSpell } from '../library/types';
import { spellDamageDice } from '../library/apply';
import { mod, spellAttack, spellDC } from './calc';

/** Ресурс зарядов предмета. */
export function chargesOf(c: Character, item: Item): Resource | undefined {
  return item.resourceId ? c.resources.find((r) => r.id === item.resourceId) : undefined;
}

/** Сколько единиц цены можно выбрать: [минимум, максимум]; максимум ограничен зарядами/штуками. */
export function costRange(c: Character, item: Item, p: ItemPower): [number, number] {
  const min = Math.max(1, p.cost);
  let max = p.costMax ?? min;
  if (p.cost > 0 && item.resourceId) max = Math.min(max, chargesOf(c, item)?.current ?? 0);
  if (p.consume) max = Math.min(max, item.qty);
  // «раз на день» вичерпано — до світанку (або поки не минуть дні)
  if (p.uses && p.uses.used >= p.uses.max) max = 0;
  return [min, Math.max(0, max)];
}

/** Скільки разів ще можна (null — без обмеження). */
export const usesLeft = (p: ItemPower): number | null => (p.uses ? Math.max(0, p.uses.max - p.uses.used) : null);

/** Можно ли использовать с ценой n. */
export function canUse(c: Character, item: Item, p: ItemPower, n: number): boolean {
  const [min, max] = costRange(c, item, p);
  return n >= min && n <= max;
}

/** Формула броска с усилением: dice + extra за каждую единицу сверх минимальной цены. */
export function powerFormula(p: ItemPower, n: number): string {
  if (!p.dice.trim()) return '';
  const extraN = p.extra.trim() ? Math.max(0, n - Math.max(1, p.cost)) : 0;
  if (!extraN) return p.dice.trim();
  // «8d6» + 2×«1d6» → «10d6»; иначе просто суммой («3d4+3+1d4+1»)
  const base = /^(\d+)d(\d+)$/i.exec(p.dice.trim());
  const ex = /^(\d+)d(\d+)$/i.exec(p.extra.trim());
  if (base && ex && base[2] === ex[2]) return `${Number(base[1]) + Number(ex[1]) * extraN}d${base[2]}`;
  return [p.dice.trim(), ...Array.from({ length: extraN }, () => p.extra.trim())].join('+');
}

/** Списать цену. Возвращает: заряды кончились (для риска последнего заряда) и предмет израсходован. */
export function spendPower(c: Character, itemId: string, p: ItemPower, n: number): { emptied: Resource | null; usedUp: boolean } {
  const item = c.equipment.find((x) => x.id === itemId);
  if (!item) return { emptied: null, usedUp: false };
  let emptied: Resource | null = null;
  if (p.cost > 0) {
    const r = chargesOf(c, item);
    if (r) {
      r.current = Math.max(0, r.current - n);
      if (r.current === 0) emptied = r;
    }
  }
  // одне застосування — незалежно від ціни в зарядах
  const own = item.powers.find((x) => x.id === p.id);
  if (own?.uses) own.uses.used = Math.min(own.uses.max, own.uses.used + 1);
  let usedUp = false;
  if (p.consume) {
    item.qty = Math.max(0, item.qty - n);
    if (item.qty === 0) {
      removeItem(c, itemId);
      usedUp = true;
    }
  }
  return { emptied, usedUp };
}

/**
 * Прочитати посібник/том: характеристика +2 (до 30), книга лишається звичайною (магія повернеться за століття),
 * а в особливостях — запис, що максимум цієї характеристики теж +2.
 */
export function studyBook(c: Character, itemId: string, p: ItemPower, feature: { name: string; text: string }): { from: number; to: number } | null {
  const item = c.equipment.find((x) => x.id === itemId);
  if (!item || !p.boost) return null;
  const from = c.abilities[p.boost];
  const to = Math.min(30, from + 2);
  c.abilities[p.boost] = to;
  item.magic = false;
  item.powers = [];
  item.attune = false;
  item.attuned = false;
  c.features.push({ id: uid(), name: feature.name, text: feature.text });
  return { from, to };
}

/** Длинный отдых «на світанку»: заряды с формулой восстанавливаются броском, без формулы — до максимума. */
export function regainCharges(r: Resource): number {
  if (!r.regain) {
    const add = r.max - r.current;
    r.current = r.max;
    return add;
  }
  const got = Math.max(0, rollFormula(r.regain, { rng: cryptoRng }).total);
  const before = r.current;
  r.current = Math.min(r.max, r.current + got);
  return r.current - before;
}

/** Уровень каста: базовый + усиление (жезлы: каждый заряд сверх минимума — +1 коло). */
export function castLevel(p: ItemPower, n: number): number {
  return p.level + (p.upcast ? Math.max(0, n - Math.max(1, p.cost)) : 0);
}

/** Значение по уровню из таблицы заклинания: точное или ближайшее меньшее. */
function atLevel(table: Record<string, string> | undefined, lvl: number): string {
  if (!table) return '';
  if (table[String(lvl)]) return table[String(lvl)];
  const keys = Object.keys(table)
    .map(Number)
    .filter((k) => k <= lvl)
    .sort((a, b) => b - a);
  return keys.length ? table[String(keys[0])] : Object.values(table)[0];
}

/** Что даёт заклинание из предмета: кубики (урон/лечение на уровне каста), СК, бонус атаки. */
export function spellCast(
  c: Character,
  p: ItemPower,
  n: number,
  s: LibSpell,
): { formula: string; result: 'heal' | 'damage' | 'info'; dc: number | null; attack: number | null; level: number } {
  const level = castLevel(p, n) || s.l;
  let formula = '';
  let result: 'heal' | 'damage' | 'info' = 'info';
  if (s.dm) {
    formula = s.dm.c ? spellDamageDice(s, c.level) : atLevel(s.dm.s, level);
    result = formula ? 'damage' : 'info';
  } else if (s.hl) {
    const m = c.spellcasting.enabled ? mod(c, c.spellcasting.ability) : 0;
    formula = atLevel(s.hl, level).replace(/\+?\s*(MOD|МОД)/g, m ? `${m > 0 ? '+' : '-'}${Math.abs(m)}` : '');
    result = formula ? 'heal' : 'info';
  }
  const dc = p.dcUser ? spellDC(c) : p.dc;
  const attack = s.at ? (p.attack ?? spellAttack(c)) : null;
  return { formula, result, dc: s.sv || dc != null ? dc : null, attack, level };
}
