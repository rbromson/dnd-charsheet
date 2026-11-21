import type { Ability, ArmorKind } from '../model/types';

/** Записи библиотеки SRD 5.1 (сжатые ключи — см. scripts/build-library.py). */
export interface LibWeapon {
  d: string;
  dt: string;
  p: string[];
  f: boolean;
  rg: boolean;
  m: boolean;
  v?: string;
  rn?: string;
}
export interface LibArmor {
  k: ArmorKind;
  b: number;
  /** нет — без предела; 0 — Вправність не добавляется; N — максимум */
  dx?: number;
  s?: number;
  sd?: boolean;
}
export interface LibMech {
  b?: number;
  ac?: number;
  sv?: number;
  set?: [Ability, number];
  ch?: number;
  rc?: 'dawn';
  noArmor?: boolean;
  /** нужно выбрать основу: 'w:any' | 'w:sword' | 'w:axe|sword' | 'w:sword-slashing' | 'w:ammo' | 'a:light|medium|heavy' … */
  pick?: string;
}
export type LibCat = 'weapon' | 'armor' | 'gear' | 'tool' | 'magic';
export interface LibItem {
  id: string;
  n: string;
  en: string;
  c: LibCat;
  /** подкатегория волшебного предмета: weapon, armor, ring, rod, staff, wand, potion, scroll, wondrous, ammunition */
  mc?: string;
  /** строка вида / типа */
  k: string;
  r?: string;
  a?: boolean;
  t: string;
  cost?: string;
  wt?: number;
  w?: LibWeapon;
  ar?: LibArmor;
  /** описание-родитель: у него есть конкретные варианты */
  par?: boolean;
  /** вариант этого родителя */
  of?: string;
  x?: LibMech;
}

export interface LibSpell {
  id: string;
  n: string;
  en: string;
  l: number;
  sc: string;
  ct: string;
  rg: string;
  cp: string;
  mt?: string;
  du: string;
  co?: boolean;
  ri?: boolean;
  cl: string[];
  t: string;
  h?: string;
  at?: 'melee' | 'ranged';
  sv?: Ability;
  dm?: { t: string; c?: Record<string, string>; s?: Record<string, string> };
  hl?: Record<string, string>;
}
