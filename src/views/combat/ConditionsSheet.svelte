<script lang="ts">
  /** Стани (14 з SRD), виснаження 0–6 і концентрація. Тап по стану — увімкнути / вимкнути. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import TextField from '../../components/TextField.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { CONDITIONS, endConcentration, type Condition } from '../../lib/rules/conditions';
  import { t } from '../../lib/i18n';
  import { toggleCondition } from './conditions';

  const c = $derived(charStore.current!);
  const on = (k: Condition) => c.conditions.includes(k);
</script>

{#if c}
  <SheetFrame kicker={t('nav.combat')} title={t('cond.title')}>
    <div class="grid">
      {#each CONDITIONS as k (k)}
        <button class="cond" class:on={on(k)} aria-pressed={on(k)} onclick={() => toggleCondition(k)}>
          <span class="nm">{t(`cond.${k}`)}</span>
          <span class="fx">{t(`cond.${k}.fx`)}</span>
        </button>
      {/each}
    </div>

    <div class="ex">
      <div class="exh">
        <span class="label">{t('cond.exhaustion')}</span>
        <Stepper bind:value={c.exhaustion} min={0} max={6} />
      </div>
      {#if c.exhaustion > 0}
        <ol class="levels">
          {#each [1, 2, 3, 4, 5, 6] as n (n)}
            <li class:on={n <= c.exhaustion}>{n}. {t(`cond.ex.${n}`)}</li>
          {/each}
        </ol>
      {/if}
      <p class="hint">{t('cond.exHint')}</p>
    </div>

    <div class="conc">
      <span class="label">{t('cond.conc')}</span>
      <div class="crow">
        <div class="grow">
          <TextField bind:value={() => c.concentration ?? '', (v) => (v.trim() ? (c.concentration = v) : endConcentration(c))} placeholder={t('cond.concPh')} />
        </div>
        {#if c.concentration}
          <button class="btn btn-outline" onclick={() => endConcentration(c)}>{t('cond.concEnd')}</button>
        {/if}
      </div>
    </div>
    {#snippet footer()}
      <button class="btn btn-outline grow" onclick={() => ui.closeSheet()}>{t('common.done')}</button>
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 6px;
  }
  .cond {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    padding: 8px 10px;
    border-radius: 3px;
    text-align: left;
    color: var(--ink);
    background: rgba(42, 31, 23, 0.05);
    box-shadow: inset 0 0 0 1px rgba(150, 112, 62, 0.35);
  }
  .cond.on {
    background: color-mix(in srgb, var(--bad) 14%, transparent);
    box-shadow: inset 0 0 0 1.5px var(--bad);
  }
  .nm {
    font-weight: 700;
    font-size: 14px;
  }
  .fx {
    font-size: 11.5px;
    line-height: 1.3;
    color: var(--ink2);
  }
  .ex,
  .conc {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
  }
  .exh,
  .crow {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .exh .label {
    flex: 1;
  }
  .levels {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 13px;
    color: var(--ink2);
  }
  .levels li.on {
    color: var(--bad);
    font-weight: 600;
  }
  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--ink2);
  }
</style>
