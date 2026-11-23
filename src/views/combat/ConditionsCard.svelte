<script lang="ts">
  /**
   * Стани, виснаження, концентрація. На «Бій» — завжди (рядок «Жодних станів» + кнопка);
   * на «Аркуші» (onlyActive) — лише коли щось діє.
   */
  import Icon from '../../components/Icon.svelte';
  import ConditionsSheet from './ConditionsSheet.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { endConcentration, type Condition } from '../../lib/rules/conditions';
  import { t } from '../../lib/i18n';
  import { toggleCondition } from './conditions';

  let { onlyActive = false }: { onlyActive?: boolean } = $props();

  const c = $derived(charStore.current!);
  const conds = $derived((c?.conditions ?? []) as Condition[]);
  const any = $derived(conds.length > 0 || (c?.exhaustion ?? 0) > 0 || !!c?.concentration);
  const open = () => ui.openSheet(ConditionsSheet, {});
  const fxLines = $derived([
    ...conds.map((k) => `${t(`cond.${k}`)}: ${t(`cond.${k}.fx`)}`),
    ...((c?.exhaustion ?? 0) > 0 ? [`${t('cond.exLevel', { n: c.exhaustion })}: ${[1, 2, 3, 4, 5, 6].filter((n) => n <= c.exhaustion).map((n) => t(`cond.ex.${n}`)).join('; ')}`] : []),
  ]);
</script>

{#if c && (!onlyActive || any)}
  <section class="card cc" class:active={any}>
    <div class="head">
      <h3 class="card-title">{t('cond.title')}</h3>
      <button class="btn btn-ghost addc" onclick={open}><Icon name="plus" size={18} />{t('cond.add')}</button>
    </div>
    {#if any}
      <div class="chips">
        {#each conds as k (k)}
          <span class="chip bad">
            <button class="lbl" onclick={open}>{t(`cond.${k}`)}</button>
            <button class="x" aria-label={`${t('common.delete')} ${t(`cond.${k}`)}`} onclick={() => toggleCondition(k)}><Icon name="close" size={14} stroke={2.4} /></button>
          </span>
        {/each}
        {#if c.exhaustion > 0}
          <span class="chip bad">
            <button class="lbl" onclick={open}>{t('cond.exLevel', { n: c.exhaustion })}</button>
            <button class="x" aria-label="−1" onclick={() => (c.exhaustion = Math.max(0, c.exhaustion - 1))}><Icon name="minus" size={14} stroke={2.4} /></button>
          </span>
        {/if}
        {#if c.concentration}
          <span class="chip conc">
            <button class="lbl" onclick={open}>{t('cond.concOn', { s: c.concentration })}</button>
            <button class="x" aria-label={t('cond.concEnd')} onclick={() => charStore.update((ch) => endConcentration(ch), { undo: t('cond.concEnded', { s: c.concentration ?? '' }) })}
              ><Icon name="close" size={14} stroke={2.4} /></button
            >
          </span>
        {/if}
      </div>
      {#if fxLines.length}
        <ul class="fx">
          {#each fxLines as l, i (i)}<li>{l}</li>{/each}
        </ul>
      {/if}
    {:else}
      <div class="none">{t('cond.none')}</div>
    {/if}
  </section>
{/if}

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .head .card-title {
    margin-bottom: 0;
  }
  .addc {
    padding: 0 8px;
    gap: 4px;
  }
  .cc.active {
    box-shadow:
      inset 0 0 0 1.5px color-mix(in srgb, var(--bad) 55%, transparent),
      0 2px 8px color-mix(in srgb, var(--bg) 70%, transparent);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    border-radius: 3px;
    font-size: 14px;
    font-weight: 600;
    overflow: hidden;
  }
  .chip.bad {
    color: var(--ink);
    background: color-mix(in srgb, var(--bad) 14%, transparent);
    box-shadow: inset 0 0 0 1px var(--bad);
  }
  .chip.conc {
    color: var(--ink);
    background: color-mix(in srgb, var(--temp) 14%, transparent);
    box-shadow: inset 0 0 0 1px var(--temp);
  }
  .lbl {
    padding: 6px 4px 6px 10px;
    min-height: 36px;
    font: inherit;
    color: inherit;
  }
  .x {
    width: 32px;
    min-height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ink2);
  }
  .fx {
    margin: 8px 0 0;
    padding: 0 0 0 16px;
    font-size: 12.5px;
    color: var(--ink2);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .none {
    margin-top: 4px;
    font-size: 13px;
    color: var(--ink2);
  }
</style>
