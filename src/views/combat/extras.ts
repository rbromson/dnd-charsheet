import type { Attack, Character, ExtraDamage } from '../../lib/model/types';
import { attackExtras } from '../../lib/rules/calc';
import { dieText, t } from '../../lib/i18n';

const lbl = (x: ExtraDamage) => `+${dieText(x.dice)}${x.type ? ` ${x.type}` : ''}${x.when ? ` · ${x.when}` : x.crit ? ` · ${t('combat.extraCrit')}` : ''}`;

/** Доп. урон для окна броска: по выбору (проти виду істот) и на критичному. */
export function requestExtras(c: Character, atk: Attack): { id: string; label: string; dice: string; crit: boolean }[] {
  const ex = attackExtras(c, atk);
  return [...ex.options, ...ex.crit].map((x) => ({ id: x.id, label: lbl(x), dice: x.dice, crit: x.crit }));
}
