/**
 * Опір, імунітет і вразливість до шкоди: свої (раса, клас — вписані вручну) і від предметів/зілль.
 * Цілі модифікаторів: 'resist:fire', 'immune:poison', 'vuln:cold'; 'resist:' — тип ще не обрано.
 */
import type { Character } from '../model/types';
import { allMods } from './calc';

export const DAMAGE_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
  'nonmagical',
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];
export type DefKind = 'resist' | 'immune' | 'vuln';
export const DEF_KINDS: DefKind[] = ['resist', 'immune', 'vuln'];

export function parseDef(t: string): { kind: DefKind; type: string } | null {
  const m = /^(resist|immune|vuln):(.*)$/.exec(t);
  return m ? { kind: m[1] as DefKind, type: m[2] } : null;
}

export interface Defense {
  type: string;
  resist: boolean;
  immune: boolean;
  vuln: boolean;
  /** звідки: «свій», назва предмета чи зілля */
  sources: string[];
}

/** Усі захисти персонажа по типах шкоди (у порядку DAMAGE_TYPES). */
export function defenses(c: Character, own = ''): Defense[] {
  const map = new Map<string, Defense>();
  const put = (t: string, src: string) => {
    const d = parseDef(t);
    if (!d || !d.type) return;
    const x = map.get(d.type) ?? { type: d.type, resist: false, immune: false, vuln: false, sources: [] };
    x[d.kind] = true;
    if (src && !x.sources.includes(src)) x.sources.push(src);
    map.set(d.type, x);
  };
  for (const t of c.defenses ?? []) put(t, own);
  for (const { m, name } of allMods(c)) if (!m.when) put(m.t, name);
  const order = (t: string) => {
    const i = (DAMAGE_TYPES as readonly string[]).indexOf(t);
    return i < 0 ? 99 : i;
  };
  return [...map.values()].sort((a, b) => order(a.type) - order(b.type));
}

/** Скільки шкоди пройде: імунітет — 0, опір — половина (вниз), вразливість — удвічі. */
export function adjustDamage(n: number, d: Pick<Defense, 'resist' | 'immune' | 'vuln'> | null | undefined): number {
  if (!d || n <= 0) return Math.max(0, n);
  if (d.immune) return 0;
  let v = n;
  if (d.resist) v = Math.floor(v / 2);
  if (d.vuln) v *= 2;
  return v;
}
