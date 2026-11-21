<script lang="ts">
  /** Настройки кидка рятунку. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import TweakEditor from '../../components/TweakEditor.svelte';
  import Icon from '../../components/Icon.svelte';
  import CalcLine from './CalcLine.svelte';
  import { saveParts } from './explain';
  import type { Ability } from '../../lib/model/types';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { fmt, saveAuto, saveBonus } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  let { ability }: { ability: Ability } = $props();

  const c = $derived(charStore.current!);
  const name = $derived(t(`ability.${ability}`));

  function roll() {
    dice.rollCheck({ kind: 'save', label: t('sheet.saveLabel', { ability: name }), bonus: saveBonus(c, ability) });
    ui.closeSheet();
  }
</script>

{#if c}
  <SheetFrame kicker={t('sheet.saveKicker')} title={name} value={fmt(saveBonus(c, ability))}>
    <Toggle
      label={t('sheet.saveProf')}
      bind:checked={() => c.saves[ability].prof === 1, (v) => (c.saves[ability].prof = v ? 1 : 0)}
    />
    <TweakEditor bind:tweak={c.saves[ability]} auto={saveAuto(c, ability)} />
    <CalcLine parts={saveParts(c, ability)} total={saveAuto(c, ability)} override={c.saves[ability].override} />

    {#snippet footer()}
      <button class="btn btn-ink grow" onclick={roll}><Icon name="dice" size={20} />{t('sheet.roll')} {fmt(saveBonus(c, ability))}</button>
    {/snippet}
  </SheetFrame>
{/if}
