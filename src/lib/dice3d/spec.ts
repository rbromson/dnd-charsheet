/** Общие типы 3D-костей без three.js (чтобы библиотека грузилась лениво, только в scene.ts). */
export type Tone = 'ember' | 'gold' | 'bad' | 'dim' | 'wine';
export interface DieSpec {
  sides: number;
  value: number;
  tone?: Tone;
  /** отброшенная кость (перевага/перешкода) — полупрозрачная */
  struck?: boolean;
}
export const SUPPORTED = new Set([4, 6, 8, 10, 12, 20, 100]);
export const ROLL_MS = 1250;

/** Физическая кость на столе: сколько граней, какая грань сверху (0-based), подписи граней. */
export interface PhysDie {
  sides: number;
  face: number;
  labels: string[];
  tone: Tone;
  struck: boolean;
  /** индекс исходного DieSpec (d100 даёт две физические кости) */
  src: number;
}

const range = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i));
/** Десятки процентной кости: 00, 10 … 90. */
export const PERCENT_LABELS = range(10, (i) => (i === 0 ? '00' : String(i * 10)));
/** Единицы для d100: 0 … 9. */
export const UNIT_LABELS = range(10, (i) => String(i));

/** d100 = десятки + единицы; «00» и «0» вместе — это 100. */
export function percentParts(value: number): { tens: number; units: number } {
  const v = Math.min(100, Math.max(1, Math.round(value)));
  const units = v % 10;
  const tens = ((v - units) / 10) % 10;
  return { tens, units };
}

/** Раскладывает броски на физические кости: d100 → два d10 (десятки винного цвета + единицы). */
export function expandSpecs(specs: DieSpec[]): PhysDie[] {
  const out: PhysDie[] = [];
  specs.forEach((s, src) => {
    const tone = s.struck ? 'dim' : (s.tone ?? 'ember');
    const struck = !!s.struck;
    if (s.sides === 100) {
      const { tens, units } = percentParts(s.value);
      out.push({ sides: 10, face: tens, labels: PERCENT_LABELS, tone: tone === 'ember' ? 'wine' : tone, struck, src });
      out.push({ sides: 10, face: units, labels: UNIT_LABELS, tone, struck, src });
    } else {
      out.push({ sides: s.sides, face: Math.max(0, Math.min(s.sides - 1, s.value - 1)), labels: range(s.sides, (i) => String(i + 1)), tone, struck, src });
    }
  });
  return out;
}
