/** Общие типы 3D-костей без three.js (чтобы библиотека грузилась лениво, только в scene.ts). */
export type Tone = 'ember' | 'gold' | 'bad' | 'dim';
export interface DieSpec {
  sides: number;
  value: number;
  tone?: Tone;
  /** отброшенная кость (перевага/перешкода) — полупрозрачная */
  struck?: boolean;
}
export const SUPPORTED = new Set([4, 6, 8, 10, 12, 20]);
export const ROLL_MS = 1250;
