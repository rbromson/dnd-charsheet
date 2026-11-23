import type { Rng } from './rng';

export interface DiceTerm {
  count: number;
  sides: number;
  sign: 1 | -1;
}
export interface ParsedFormula {
  dice: DiceTerm[];
  flat: number;
}

/** Терпимый разбор: «1d6+3», «2Д8 - 1», «1к6+1», «d20», «+5», пустая строка. Непонятные куски игнорируются. */
export function parseFormula(input: string): ParsedFormula {
  const s = (input ?? '').replace(/\s+/g, '').replace(/[дДкК]/g, 'd').replace(/−/g, '-').toLowerCase();
  const out: ParsedFormula = { dice: [], flat: 0 };
  const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m[3]) {
      const sign = m[1] === '-' ? -1 : 1;
      const count = m[2] ? parseInt(m[2], 10) : 1;
      const sides = parseInt(m[3], 10);
      if (count > 0 && sides > 0) out.dice.push({ count: Math.min(count, 100), sides, sign });
    } else if (m[5]) {
      out.flat += (m[4] === '-' ? -1 : 1) * parseInt(m[5], 10);
    }
  }
  return out;
}

export interface DieResult {
  sides: number;
  value: number;
  sign: 1 | -1;
}
export interface FormulaRoll {
  formula: string;
  dice: DieResult[];
  flat: number;
  total: number;
  crit: boolean;
}

/** Крит удваивает количество костей, но не модификатор. */
export function rollFormula(formula: string, opts: { rng: Rng; crit?: boolean }): FormulaRoll {
  const p = parseFormula(formula);
  const dice: DieResult[] = [];
  for (const t of p.dice) {
    const n = t.count * (opts.crit ? 2 : 1);
    // d100 — процентная кость: только десятки 00…90 (для 1–100 к ней докидывают d10)
    for (let i = 0; i < n; i++) dice.push({ sides: t.sides, value: t.sides === 100 ? (opts.rng(10) - 1) * 10 : opts.rng(t.sides), sign: t.sign });
  }
  const total = dice.reduce((s, d) => s + d.sign * d.value, 0) + p.flat;
  return { formula, dice, flat: p.flat, total, crit: !!opts.crit };
}

export function formatFormula(p: ParsedFormula, crit = false): string {
  const parts = p.dice.map((d, i) => `${d.sign < 0 ? '-' : i ? '+' : ''}${d.count * (crit ? 2 : 1)}d${d.sides}`);
  let s = parts.join('');
  if (p.flat) s += (p.flat > 0 ? (s ? '+' : '') : '-') + Math.abs(p.flat);
  return s || '0';
}
