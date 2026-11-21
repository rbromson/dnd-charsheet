export interface Hp {
  max: number;
  current: number;
  temp: number;
}

/** Урон сначала снимает временные хиты, потом текущие (не ниже 0). */
export function applyDamage(hp: Hp, amount: number): Hp {
  const n = Math.max(0, Math.floor(amount));
  const fromTemp = Math.min(hp.temp, n);
  const rest = n - fromTemp;
  return { ...hp, temp: hp.temp - fromTemp, current: Math.max(0, hp.current - rest) };
}

/** Лечение до максимума; временные не трогает. */
export function applyHeal(hp: Hp, amount: number): Hp {
  const n = Math.max(0, Math.floor(amount));
  return { ...hp, current: Math.min(hp.max, hp.current + n) };
}

/** Временные хиты не складываются: берётся большее. */
export function setTemp(hp: Hp, amount: number): Hp {
  return { ...hp, temp: Math.max(hp.temp, Math.max(0, Math.floor(amount))) };
}
