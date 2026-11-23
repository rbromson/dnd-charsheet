/** Дії зі станами, спільні для картки й шторки: увімкнути/вимкнути, концентрація після шкоди. */
import { charStore } from '../../lib/stores/characters.svelte';
import { dice } from '../../lib/stores/dice.svelte';
import { ui } from '../../lib/stores/ui.svelte';
import { concentrationDc, incapacitated, type Condition } from '../../lib/rules/conditions';
import { saveBonus } from '../../lib/rules/calc';
import { t } from '../../lib/i18n';

export function toggleCondition(k: Condition) {
  const c = charStore.current;
  if (!c) return;
  const on = !c.conditions.includes(k);
  const conc = c.concentration;
  charStore.update(
    (ch) => {
      ch.conditions = on ? [...ch.conditions, k] : ch.conditions.filter((x) => x !== k);
      // недієздатний — концентрація обривається
      if (on && ch.concentration && incapacitated(ch)) ch.concentration = null;
    },
    { undo: () => `${t(`cond.${k}`)}${on ? ' ✓' : ' ✗'}${on && conc && !charStore.current?.concentration ? ` · ${t('cond.concIncap', { s: conc })}` : ''}` },
  );
}

/** Після шкоди при концентрації: підказка з кнопкою кидка; провал — концентрацію знято. */
export function concentrationCheck(damage: number) {
  const c = charStore.current;
  if (!c?.concentration || damage <= 0) return;
  const s = c.concentration;
  if (c.hp.current === 0) {
    charStore.update(
      (ch) => {
        ch.concentration = null;
      },
      { undo: t('cond.concIncap', { s }) },
    );
    return;
  }
  const dc = concentrationDc(damage);
  ui.toast(
    t('cond.concDamage', { s, dc }),
    () => {
      const cur = charStore.current;
      if (!cur) return;
      dice.askCheck({ kind: 'save', ability: 'con', label: t('cond.concDamage', { s, dc }), bonus: saveBonus(cur, 'con') }, (e) => {
        if (e.type !== 'd20') return;
        dice.whenLanded(dice.seq, () => {
          if (e.roll.total >= dc) {
            ui.toast(t('cond.concKept', { dc }));
            return;
          }
          charStore.update(
            (ch) => {
              if (ch.concentration === s) ch.concentration = null;
            },
            { undo: t('cond.concLost', { dc }) },
          );
        });
      });
    },
    10000,
    t('cond.concRoll'),
  );
}
