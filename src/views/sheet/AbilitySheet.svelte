<script lang="ts">
  /** Характеристика: значение + настройки соответствующего спасброска. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import TweakEditor from '../../components/TweakEditor.svelte';
  import Icon from '../../components/Icon.svelte';
  import CalcLine from './CalcLine.svelte';
  import { saveParts } from './explain';
  import type { Ability } from '../../lib/model/types';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { abilityMod, fmt, saveAuto, saveBonus } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  let { ability }: { ability: Ability } = $props();

  const c = $derived(charStore.current!);
  const name = $derived(t(`ability.${ability}`));
  const m = $derived(c ? abilityMod(c.abilities[ability]) : 0);

  function rollCheck() {
    dice.askCheck({ kind: 'ability', label: t('sheet.checkLabel', { ability: name }), bonus: m });
    ui.closeSheet();
  }
  function rollSave() {
    dice.askCheck({ kind: 'save', label: t('sheet.saveLabel', { ability: name }), bonus: saveBonus(c, ability) });
    ui.closeSheet();
  }
</script>

{#if c}
  <SheetFrame kicker={t('sheet.abilityKicker')} title={name} value={fmt(m)}>
    <div class="score">
      <div class="grow">
        <NumberField label={t('sheet.score')} bind:value={c.abilities[ability]} min={1} max={30} big />
      </div>
      <div class="mod">
        <span class="label">{t('sheet.modifier')}</span>
        <span class="num">{fmt(m)}</span>
      </div>
    </div>

    <div class="divider"></div>
    <h3 class="card-title">{t('sheet.saveKicker')} · <span class="num">{fmt(saveBonus(c, ability))}</span></h3>
    <Toggle
      label={t('sheet.saveProf')}
      bind:checked={() => c.saves[ability].prof === 1, (v) => (c.saves[ability].prof = v ? 1 : 0)}
    />
    <TweakEditor bind:tweak={c.saves[ability]} auto={saveAuto(c, ability)} />
    <CalcLine parts={saveParts(c, ability)} total={saveAuto(c, ability)} override={c.saves[ability].override} />

    {#snippet footer()}
      <button class="btn btn-outline grow" onclick={rollCheck}><Icon name="dice" size={20} />{t('sheet.check')} {fmt(m)}</button>
      <button class="btn btn-ink grow" onclick={rollSave}><Icon name="shield" size={20} />{t('sheet.rollSave')} {fmt(saveBonus(c, ability))}</button>
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .score {
    display: flex;
    gap: 16px;
    align-items: flex-end;
  }
  .mod {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 110px;
  }
  .mod .num {
    font-size: 40px;
    line-height: 56px;
  }
  .card-title {
    display: block;
    margin: 0;
  }
  .card-title::before,
  .card-title::after {
    display: none;
  }
</style>
