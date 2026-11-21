import type { Rng } from './rng';

export type RollMode = 'normal' | 'adv' | 'dis';

export interface D20Die {
  /** Грань после возможного переброса единицы */
  face: number;
  /** Если единица была переброшена — исходная грань (1) */
  rerolledFrom?: number;
  /** Значение после минимума на d20 */
  value: number;
  kept: boolean;
}

export interface ExtraDie {
  sides: number;
  value: number;
  label: string;
}

export interface D20Roll {
  mode: RollMode;
  bonus: number;
  minD20: number | null;
  dice: D20Die[];
  extra: ExtraDie[];
  /** Грань оставленной кости (для крита/провала) */
  natural: number;
  total: number;
  crit: boolean;
  fumble: boolean;
}

export interface D20Options {
  bonus: number;
  mode?: RollMode;
  minD20?: number | null;
  rerollOnes?: boolean;
  rng: Rng;
}

export function rollD20(o: D20Options): D20Roll {
  const mode = o.mode ?? 'normal';
  const n = mode === 'normal' ? 1 : 2;
  const dice: D20Die[] = [];
  for (let i = 0; i < n; i++) {
    let face = o.rng(20);
    let rerolledFrom: number | undefined;
    if (o.rerollOnes && face === 1) {
      rerolledFrom = 1;
      face = o.rng(20);
    }
    const value = o.minD20 && face < o.minD20 ? o.minD20 : face;
    dice.push({ face, rerolledFrom, value, kept: false });
  }
  let keep = 0;
  if (mode === 'adv' && dice[1].value > dice[0].value) keep = 1;
  if (mode === 'dis' && dice[1].value < dice[0].value) keep = 1;
  dice[keep].kept = true;
  const k = dice[keep];
  return {
    mode,
    bonus: o.bonus,
    minD20: o.minD20 ?? null,
    dice,
    extra: [],
    natural: k.face,
    total: k.value + o.bonus,
    crit: k.face === 20,
    fumble: k.face === 1,
  };
}

/** Докинуть кость (например d4 из ресурса). Возвращает новый объект. */
export function addDie(roll: D20Roll, sides: number, label: string, rng: Rng): D20Roll {
  const value = rng(sides);
  return { ...roll, extra: [...roll.extra, { sides, value, label }], total: roll.total + value };
}
