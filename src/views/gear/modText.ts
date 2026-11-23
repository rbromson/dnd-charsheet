import type { ItemMod } from '../../lib/model/types';
import { t } from '../../lib/i18n';

const sign = (n: number) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);

/** Человеческое описание модификатора: «+1 до перевірок», «Темний зір 60 фт», «Лазіння = ходьба». */
export function modText(m: ItemMod): string {
  if (m.when) return m.when;
  const v = m.v * (m.perLevel ? 1 : 1);
  if (m.t.startsWith('ability:')) {
    const a = t(`ability.${m.t.slice(8)}`);
    if (m.op === 'add') return m.cap != null ? t('mod.abilityCap', { n: sign(v), a, cap: m.cap }) : `${sign(v)} ${a}`;
    return t('mod.abilitySet', { a, n: v });
  }
  if (m.t.startsWith('save:')) return t('mod.saveOne', { n: sign(v), a: t(`ability.${m.t.slice(5)}`) });
  switch (m.t) {
    case 'fly':
    case 'swim':
    case 'climb':
      return v ? t(`mod.${m.t}`, { n: v }) : t(`mod.${m.t}Walk`);
    case 'darkvision':
      return t('mod.darkvision', { n: v });
    case 'speed':
      return m.op === 'min' ? t('mod.speedMin', { n: v }) : m.op === 'set' ? t('mod.speedSet', { n: v }) : t('mod.speedAdd', { n: sign(v) });
    case 'acBase':
      return t('mod.acBase', { n: v });
    case 'hpMax':
      return t('mod.hpMax', { n: sign(v) }) + (m.perLevel ? ` ${t('mod.perLevel')}` : '');
    default:
      return t(`mod.${m.t}`, { n: sign(v) });
  }
}

/** Цели для редактора своих предметов. */
export const MOD_TARGETS = [
  'check',
  'save',
  'initiative',
  'prof',
  'ac',
  'acBase',
  'spellAttack',
  'spellDc',
  'speed',
  'fly',
  'swim',
  'climb',
  'darkvision',
  'ability:str',
  'ability:dex',
  'ability:con',
  'ability:int',
  'ability:wis',
  'ability:cha',
] as const;
