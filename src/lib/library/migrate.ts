/**
 * Одноразовое обновление предметов, добавленных из библиотеки раньше, чем появились действия и заряды:
 * проставить «Випити»/«Витратити заряди», формулу восстановления и риск последнего заряда.
 */
import type { Character } from '../model/types';
import type { LibItem, LibSpell } from './types';
import { CHARGES, hasSpells, powersFor } from './powers';

export const MECH_VERSION = 2;

export function migrateMechanics(c: Character, lib: LibItem[], spells: LibSpell[] = []): boolean {
  if (c.rules.mech >= MECH_VERSION) return false;
  const byId = new Map(lib.map((e) => [e.id, e]));
  for (const it of c.equipment) {
    const e = it.ref ? byId.get(it.ref) : undefined;
    if (!e) continue;
    // v2: жезли й посохи отримують справжні заклинання замість «8к6»
    const old = c.rules.mech;
    if (!it.powers.length || (old < 2 && hasSpells(e.id) && !it.powers.some((p) => p.spell !== null))) it.powers = powersFor(e, spells);
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
