/**
 * Действия предметов: цена (заряды / штуки), формула с усилением, списание, восстановление зарядов.
 * Чистые функции — мутируют персонажа (вызывать внутри charStore.update).
 */
import type { Character, Item, ItemPower, Resource } from '../model/types';
import { rollFormula } from '../dice/formula';
import { cryptoRng } from '../dice/rng';
import { removeItem } from './weapons';

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
  return [min, Math.max(0, max)];
}

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
