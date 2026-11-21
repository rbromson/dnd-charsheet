import type { Coins } from '../../lib/model/types';

export type CoinKey = keyof Coins;
export const COIN_KEYS: CoinKey[] = ['cp', 'sp', 'ep', 'gp', 'pp'];

/** Ценность монеты в золотых. */
export const COIN_IN_GP: Record<CoinKey, number> = { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 };

/** Всё состояние кошелька в золотых (округлено до сотых). */
export function totalInGp(c: Coins): number {
  const cents = c.cp + c.sp * 10 + c.ep * 50 + c.gp * 100 + c.pp * 1000;
  return Math.round(cents) / 100;
}

/** Новое количество после «Додати/Відняти» (не уходит ниже нуля). */
export function applyCoinDelta(current: number, delta: number): number {
  return Math.max(0, Math.round(current + delta));
}
