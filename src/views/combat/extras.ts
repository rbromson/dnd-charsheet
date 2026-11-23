import type { Attack, Character, ExtraDamage } from '../../lib/model/types';
import { attackBonus, attackExtras, fullDamageFormula } from '../../lib/rules/calc';
import { ammoOf, spendAmmo } from '../../lib/rules/ammo';
import { charStore } from '../../lib/stores/characters.svelte';
import { dice } from '../../lib/stores/dice.svelte';
import { ui } from '../../lib/stores/ui.svelte';
import { dieText, t } from '../../lib/i18n';

const lbl = (x: ExtraDamage) => `+${dieText(x.dice)}${x.type ? ` ${x.type}` : ''}${x.when ? ` · ${x.when}` : x.crit ? ` · ${t('combat.extraCrit')}` : ''}`;

/** Доп. урон для окна броска: по выбору (проти виду істот) и на критичному. */
export function requestExtras(c: Character, atk: Attack): { id: string; label: string; dice: string; crit: boolean }[] {
  const ex = attackExtras(c, atk);
  return [...ex.options, ...ex.crit].map((x) => ({ id: x.id, label: lbl(x), dice: x.dice, crit: x.crit }));
}

/** Кидок атаки з окна підготовки; боєприпас (стріла, болт) знімається, коли кидок справді зроблено. */
export function rollAttack(c: Character, a: Attack) {
  dice.askCheck(
    {
      kind: 'attack',
      attackId: a.id,
      label: a.name,
      bonus: attackBonus(c, a),
      damage: a.damage.trim() ? fullDamageFormula(c, a) : undefined,
      damageLabel: t('combat.atkDamageLabel', { name: a.name }),
      extras: requestExtras(c, a),
    },
    () => {
      const cur = charStore.current;
      const am = cur ? ammoOf(cur, a) : null;
      if (!am) return;
      if (am.count <= 0) {
        ui.toast(t('combat.ammoOut', { name: am.name }));
        return;
      }
      let left: number | null = null;
      charStore.update(
        (ch) => {
          left = spendAmmo(ch, a.id);
        },
        { undo: () => t('combat.ammoLeft', { name: am.name, n: left ?? 0 }) },
      );
    },
  );
}
