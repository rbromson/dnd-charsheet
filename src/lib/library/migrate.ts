/**
 * Одноразовое обновление предметов, добавленных из библиотеки раньше, чем появились действия и заряды:
 * проставить «Випити»/«Витратити заряди», формулу восстановления и риск последнего заряда.
 */
import type { Character } from '../model/types';
import type { LibItem } from './types';
import { CHARGES, powersFor } from './powers';

export const MECH_VERSION = 1;

export function migrateMechanics(c: Character, lib: LibItem[]): boolean {
  if (c.rules.mech >= MECH_VERSION) return false;
  const byId = new Map(lib.map((e) => [e.id, e]));
  for (const it of c.equipment) {
    const e = it.ref ? byId.get(it.ref) : undefined;
    if (!e) continue;
    if (!it.powers.length) it.powers = powersFor(e);
    const r = it.resourceId ? c.resources.find((x) => x.id === it.resourceId) : undefined;
    const cm = CHARGES[e.id] ?? (e.of ? CHARGES[e.of] : undefined);
    if (r && cm) {
      if (!r.regain && cm.rg) r.regain = cm.rg;
      if (!r.onEmpty && cm.empty) r.onEmpty = { ...cm.empty, on: [...cm.empty.on] };
    }
  }
  c.rules.mech = MECH_VERSION;
  return true;
}
