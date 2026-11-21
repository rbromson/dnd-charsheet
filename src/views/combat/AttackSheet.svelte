<script lang="ts">
  /** Настройки атаки. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import TextField from '../../components/TextField.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import TweakEditor from '../../components/TweakEditor.svelte';
  import Icon from '../../components/Icon.svelte';
  import CalcLine from '../sheet/CalcLine.svelte';
  import { attackParts } from '../sheet/explain';
  import { ABILITIES, type Ability } from '../../lib/model/types';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { attackAuto, attackBonus, fmt, resolveDamageFormula } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  let { id }: { id: string } = $props();

  const c = $derived(charStore.current!);
  const idx = $derived(c ? c.attacks.findIndex((x) => x.id === id) : -1);
  const atk = $derived(idx >= 0 ? c.attacks[idx] : undefined);
  const abilityOptions: (Ability | null)[] = [...ABILITIES, null];

  function rollAttack() {
    if (!atk) return;
    const damage = atk.damage.trim() ? resolveDamageFormula(c, atk) : undefined;
    dice.askCheck({
      kind: 'attack',
      attackId: atk.id,
      label: atk.name,
      bonus: attackBonus(c, atk),
      damage,
      damageLabel: t('combat.atkDamageLabel', { name: atk.name }),
    });
    ui.closeSheet();
  }
  function rollDamage() {
    if (!atk) return;
    dice.rollDamage(t('combat.atkDamageLabel', { name: atk.name }), resolveDamageFormula(c, atk));
    ui.closeSheet();
  }
</script>

{#if atk}
  <SheetFrame kicker={t('combat.atkKicker')} title={atk.name || t('combat.atkNew')} value={fmt(attackBonus(c, atk))}>
    <TextField label={t('combat.atkName')} bind:value={atk.name} serif />

    <div>
      <span class="label">{t('combat.atkAbility')}</span>
      <div class="abs">
        {#each abilityOptions as a (a ?? 'none')}
          <button class="chip" class:on={atk.ability === a} aria-pressed={atk.ability === a} onclick={() => (atk.ability = a)}>
            {a ? t(`abilityShort.${a}`) : '—'}
          </button>
        {/each}
      </div>
    </div>

    <Toggle label={t('combat.atkProf')} bind:checked={atk.prof} />
    <TweakEditor bind:tweak={c.attacks[idx]} auto={attackAuto(c, atk)} />
    <CalcLine parts={attackParts(c, atk)} total={attackAuto(c, atk)} override={atk.override} />

    <div class="two">
      <div>
        <TextField label={t('combat.atkDamage')} bind:value={atk.damage} placeholder={t('combat.atkDamagePh')} />
        <div class="hint">
          {t('combat.atkDamageHint')}{#if atk.damage.trim()} · <b>{t('combat.atkResolved', { f: resolveDamageFormula(c, atk) })}</b>{/if}
        </div>
      </div>
      <TextField label={t('combat.atkDamageType')} bind:value={atk.damageType} placeholder={t('combat.atkDamageTypePh')} />
    </div>

    <TextField label={t('combat.atkNote')} bind:value={atk.note} multiline rows={2} />

    {#snippet footer()}
      <button class="btn btn-ink grow" onclick={rollAttack}><Icon name="combat" size={20} />{t('combat.atkRoll')} {fmt(attackBonus(c, atk!))}</button>
      {#if atk!.damage.trim()}
        <button class="btn btn-outline grow" onclick={rollDamage}><Icon name="dice" size={20} />{resolveDamageFormula(c, atk!)}</button>
      {/if}
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .abs {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 5px;
  }
  .abs .chip {
    min-height: var(--tap);
    min-width: 0;
    justify-content: center;
    padding: 0 2px;
    font-weight: 600;
  }
  .two {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 12px;
    align-items: start;
  }
  .hint {
    font-size: 12px;
    color: var(--ink2);
    margin-top: 4px;
  }
</style>
