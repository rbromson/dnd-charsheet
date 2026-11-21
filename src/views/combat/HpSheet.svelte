<script lang="ts">
  /** Прямое редактирование хитов: максимум, текущее, временное. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  function clampCurrent() {
    if (c.hp.current > c.hp.max) c.hp.current = c.hp.max;
  }
</script>

{#if c}
  <SheetFrame kicker={t('combat.hpKicker')} title={t('combat.hpCurrent')} value={`${c.hp.current} / ${c.hp.max}`}>
    <NumberField label={t('combat.hpCurrent')} bind:value={c.hp.current} min={0} max={c.hp.max} big />
    <NumberField label={t('combat.hpMax')} bind:value={c.hp.max} min={0} max={999} big onchange={clampCurrent} />
    <NumberField label={t('combat.hpTemp')} bind:value={c.hp.temp} min={0} max={999} big />
    {#snippet footer()}
      <button class="btn btn-outline grow" onclick={() => ui.closeSheet()}>{t('common.done')}</button>
    {/snippet}
  </SheetFrame>
{/if}
