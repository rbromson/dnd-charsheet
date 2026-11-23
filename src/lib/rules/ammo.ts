/**
 * Боєприпаси: лук/арбалет/праща пов'язані з предметом-стрілами (або ресурсом-лічильником),
 * кожен кидок атаки знімає одну штуку.
 */
import type { Attack, Character } from '../model/types';

/** Яка зброя з бібліотеки якими боєприпасами стріляє. */
export const AMMO_FOR: Record<string, string> = {
  shortbow: 'arrow',
  longbow: 'arrow',
  'crossbow-light': 'crossbow-bolt',
  'crossbow-hand': 'crossbow-bolt',
  'crossbow-heavy': 'crossbow-bolt',
  sling: 'sling-bullet',
  blowgun: 'blowgun-needle',
};
/** Скільки штук у пачці з бібліотеки (ціна й вага SRD — за пачку). */
export const AMMO_PACK: Record<string, number> = { arrow: 20, 'crossbow-bolt': 20, 'sling-bullet': 20, 'blowgun-needle': 50 };

export function ammoOf(c: Character, atk: Attack): { name: string; count: number } | null {
  if (!atk.ammoId) return null;
  const it = c.equipment.find((i) => i.id === atk.ammoId);
  if (it) return { name: it.name, count: it.qty };
  const r = c.resources.find((x) => x.id === atk.ammoId);
  if (r) return { name: r.name, count: r.current };
  return null;
}

/** −1 боєприпас за постріл. Повертає скільки лишилось (null — атака без боєприпасів). */
export function spendAmmo(c: Character, atkId: string): number | null {
  const atk = c.attacks.find((a) => a.id === atkId);
  if (!atk?.ammoId) return null;
  const it = c.equipment.find((i) => i.id === atk.ammoId);
  if (it) {
    it.qty = Math.max(0, it.qty - 1);
    return it.qty;
  }
  const r = c.resources.find((x) => x.id === atk.ammoId);
  if (r) {
    r.current = Math.max(0, r.current - 1);
    return r.current;
  }
  return null;
}

/** Прив'язати стрілецьку зброю з бібліотеки до наявних боєприпасів (обидва напрямки: лук → стріли, стріли → лук). */
export function linkAmmo(c: Character): void {
  for (const a of c.attacks) {
    if (a.ammoId && (c.equipment.some((i) => i.id === a.ammoId) || c.resources.some((r) => r.id === a.ammoId))) continue;
    a.ammoId = null;
    const w = a.itemId ? c.equipment.find((i) => i.id === a.itemId) : undefined;
    const want = w?.ref ? AMMO_FOR[w.ref] : undefined;
    if (!want) continue;
    const ammo = c.equipment.find((i) => i.ref === want);
    if (ammo) a.ammoId = ammo.id;
  }
}
