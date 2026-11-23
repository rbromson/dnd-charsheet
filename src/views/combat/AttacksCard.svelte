<script lang="ts">
  /** Атаки: «⚔ +6» — бросок попадания (с предложением урона), вторая кнопка — урон. */
  import RowActions from '../../components/RowActions.svelte';
  import Icon from '../../components/Icon.svelte';
  import AttackSheet from './AttackSheet.svelte';
  import type { Attack } from '../../lib/model/types';
  import { press } from '../../lib/actions/press';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { attackBonus, attackSaveDc, fmt, fullDamageFormula } from '../../lib/rules/calc';
  import { requestExtras } from './extras';
  import { uid } from '../../lib/model/ids';
  import { move } from '../../lib/list';
  import { MOD_WORD, dieText, t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  const open = (id: string) => ui.openSheet(AttackSheet, { id });

  function sub(a: Attack): string {
    if (a.save) return [t('combat.atkSaveShort', { ability: t(`abilityShort.${a.save}`) }), a.damageType.trim() || null].filter(Boolean).join(' · ');
    return [a.ability ? t(`abilityShort.${a.ability}`) : t('combat.atkNoAbility'), a.prof ? t('combat.atkProfShort') : null, a.damageType.trim() || null]
      .filter(Boolean)
      .join(' · ');
  }

  function rollAttack(a: Attack) {
    dice.askCheck({
      kind: 'attack',
      attackId: a.id,
      label: a.name,
      bonus: attackBonus(c, a),
      damage: a.damage.trim() ? fullDamageFormula(c, a) : undefined,
      damageLabel: t('combat.atkDamageLabel', { name: a.name }),
      extras: requestExtras(c, a),
    });
  }
  function rollDamage(a: Attack) {
    dice.rollDamage(t('combat.atkDamageLabel', { name: a.name }), fullDamageFormula(c, a));
  }

  function add() {
    const id = uid();
    c.attacks.push({ id, name: t('combat.atkNew'), ability: 'str', prof: true, bonus: 0, override: null, damage: `1d6+${MOD_WORD}`, damageType: '', note: '', itemId: null, save: null, saveDc: null });
    open(id);
  }

  async function remove(a: Attack) {
    const name = a.name || t('combat.atkNew');
    const ok = await ui.confirm(t('common.deleteConfirm', { name }), { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    charStore.update(
      (ch) => {
        const i = ch.attacks.findIndex((x) => x.id === a.id);
        if (i >= 0) ch.attacks.splice(i, 1);
      },
      { undo: t('common.deleted', { name }) },
    );
  }
</script>

<section class="card">
  <h3 class="card-title">{t('combat.attacks')}</h3>

  {#if c.attacks.length === 0 && !ui.editing}
    <div class="empty">{t('combat.atkEmpty')}</div>
  {/if}

  {#each c.attacks as a, i (a.id)}
    <div class="atk">
      <button class="info" class:editing={ui.editing} use:press={{ onTap: () => ui.editing && open(a.id), onLong: () => open(a.id) }}>
        <span class="n">{a.name || t('combat.atkNew')}</span>
        <span class="d">{sub(a)}</span>
        {#if a.note.trim()}<span class="note">{a.note}</span>{/if}
      </button>
      {#if ui.editing}
        <RowActions
          onUp={i > 0 ? () => move(c.attacks, i, -1) : undefined}
          onDown={i < c.attacks.length - 1 ? () => move(c.attacks, i, 1) : undefined}
          onDelete={() => remove(a)}
        />
      {:else}
        <div class="btns">
          {#if a.save}
            <button
              class="btn btn-ink hit"
              onclick={() => ui.toast(t('combat.atkSaveToast', { ability: t(`ability.${a.save}`), dc: attackSaveDc(c, a) }))}
              ><Icon name="shield" size={18} />{t('combat.atkDc', { dc: attackSaveDc(c, a) })}</button
            >
          {:else}
            <button class="btn btn-ink hit" onclick={() => rollAttack(a)}
              ><Icon name="combat" size={18} />{t('combat.atkRoll')}<span class="v num">{fmt(attackBonus(c, a))}</span></button
            >
          {/if}
          {#if a.damage.trim()}
            <button class="btn btn-outline dmg" onclick={() => rollDamage(a)}
              >{t('combat.damage')}<span class="v num">{dieText(fullDamageFormula(c, a))}</span></button
            >
          {/if}
        </div>
      {/if}
    </div>
  {/each}

  {#if ui.editing}
    <button class="btn btn-outline add" onclick={add}><Icon name="plus" size={20} />{t('common.add')}</button>
  {/if}
</section>

<style>
  .atk {
    display: flex;
    align-items: center;
    gap: 8px 12px;
    min-height: 60px;
    padding: 6px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--ink2) 20%, transparent);
    flex-wrap: wrap;
  }
  .atk:last-of-type {
    border-bottom: none;
  }
  .info {
    flex: 1 1 140px;
    min-width: 0;
    min-height: var(--tap);
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: left;
    color: var(--ink);
    user-select: none;
  }
  .info.editing .n {
    text-decoration: underline dashed color-mix(in srgb, var(--ink2) 50%, transparent);
    text-underline-offset: 4px;
  }
  .n {
    font-weight: 600;
    font-size: 15px;
  }
  .d {
    font-size: 12px;
    color: var(--ink2);
  }
  .note {
    font-size: 12px;
    color: var(--ink2);
    font-style: italic;
    white-space: pre-line;
  }
  /* кнопки — строкой под описанием, поровну */
  .btns {
    flex-basis: 100%;
    display: flex;
    gap: 8px;
    padding-bottom: 4px;
  }
  .btns .btn {
    flex: 1 1 0;
    min-width: 0;
    gap: 6px;
    padding: 0 12px;
    white-space: nowrap;
  }
  .btns .btn :global(svg) {
    flex-shrink: 0;
  }
  .v {
    margin-left: 2px;
    font-family: var(--font-sans);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .add {
    margin-top: 10px;
  }
</style>
