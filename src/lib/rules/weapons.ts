import type { Attack, Character, Item } from '../model/types';
import { uid } from '../model/ids';
import { mod } from './calc';
import { dieText, MOD_WORD, t } from '../i18n';

/** Атака, связанная с предметом (оружием). */
export function linkedAttack(c: Character, itemId: string): Attack | undefined {
  return c.attacks.find((a) => a.itemId === itemId);
}

/** Сделать предмет оружием: создаёт связанную атаку (мутирует персонажа). */
export function addWeaponAttack(c: Character, item: Item): Attack {
  const existing = linkedAttack(c, item.id);
  if (existing) return existing;
  // уже есть отдельная атака с тем же именем (заведена вручную) — привязываем её, а не дублируем
  const name = item.name.trim().toLowerCase();
  const same = name ? c.attacks.find((a) => !a.itemId && a.name.trim().toLowerCase() === name) : undefined;
  if (same) {
    same.itemId = item.id;
    return same;
  }
  const w = item.weapon;
  const ability = !w ? 'str' : w.ranged ? 'dex' : w.finesse && mod(c, 'dex') >= mod(c, 'str') ? 'dex' : 'str';
  const note = w
    ? [...w.props.map((p) => (p === t('lib.versatileProp') && w.versatile ? `${p} (${dieText(w.versatile)})` : p)), w.range ? `${w.range} ${t('lib.feet')}` : '']
        .filter(Boolean)
        .join(', ')
    : '';
  const atk: Attack = {
    id: uid(),
    name: item.name,
    ability,
    prof: true,
    bonus: item.bonus,
    override: null,
    damage: w?.dice ? `${w.dice}+${MOD_WORD}${item.bonus ? `+${item.bonus}` : ''}` : `1d6+${MOD_WORD}`,
    damageType: w?.type ?? '',
    note,
    itemId: item.id,
    save: null,
    saveDc: null,
  };
  c.attacks.push(atk);
  return c.attacks[c.attacks.length - 1];
}

/** Убрать предмет из атак (сам предмет остаётся). */
export function removeWeaponAttack(c: Character, itemId: string): void {
  c.attacks = c.attacks.filter((a) => a.itemId !== itemId);
}

/** Удалить предмет вместе со связанной атакой. */
export function removeItem(c: Character, itemId: string): void {
  const it = c.equipment.find((x) => x.id === itemId);
  if (it?.resourceId) c.resources = c.resources.filter((r) => r.id !== it.resourceId);
  if (it?.deckId) c.decks = c.decks.filter((d) => d.id !== it.deckId);
  c.equipment = c.equipment.filter((x) => x.id !== itemId);
  removeWeaponAttack(c, itemId);
}

/** Имя связанной атаки следует за именем предмета. */
export function syncWeaponName(c: Character, itemId: string): void {
  const item = c.equipment.find((x) => x.id === itemId);
  const atk = linkedAttack(c, itemId);
  if (item && atk && atk.name !== item.name) atk.name = item.name;
}
