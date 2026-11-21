import type { Character } from '../../lib/model/types';

export type ProfileTextKey = 'appearance' | 'backstory' | 'allies' | 'otherFeatures' | 'treasure';
export type TraitKey = keyof Character['traits'];
export type HeaderKey = 'age' | 'height' | 'weight' | 'eyes' | 'skin' | 'hair';

export const HEADER_KEYS: HeaderKey[] = ['age', 'height', 'weight', 'eyes', 'skin', 'hair'];
export const TRAIT_KEYS: TraitKey[] = ['personality', 'ideals', 'bonds', 'flaws'];

export type TextTarget = { group: 'profile'; key: ProfileTextKey } | { group: 'traits'; key: TraitKey };
