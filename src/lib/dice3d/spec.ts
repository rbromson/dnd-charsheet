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
/** Физические кости: d100 — один d10 с десятками 00…90 (винного цвета). */
export function expandSpecs(specs: DieSpec[]): PhysDie[] {
  const out: PhysDie[] = [];
  specs.forEach((s, src) => {
    const tone = s.struck ? 'dim' : (s.tone ?? 'ember');
    const struck = !!s.struck;
    if (s.sides === 100) {
      const face = Math.max(0, Math.min(9, Math.round(s.value / 10) % 10));
      out.push({ sides: 10, face, labels: PERCENT_LABELS, tone: tone === 'ember' ? 'wine' : tone, struck, src });
    } else {
      out.push({ sides: s.sides, face: Math.max(0, Math.min(s.sides - 1, s.value - 1)), labels: range(s.sides, (i) => String(i + 1)), tone, struck, src });
    }
  });
  return out;
}
