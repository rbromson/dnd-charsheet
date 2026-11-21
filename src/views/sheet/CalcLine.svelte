<script lang="ts">
  /** «Розрахунок: Мдр +3 + майстерність +3 ×2 (експертиза) = +9» или «вручну: +7». */
  import type { CalcPart } from './explain';
  import { fmt } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  let {
    parts,
    total,
    override = null,
    signed = true,
  }: { parts: CalcPart[]; total: number; override?: number | null; signed?: boolean } = $props();

  const show = (n: number, s = true) => (s ? fmt(n) : String(n));
</script>

<div class="calc">
  {#if override != null}
    <div>{t('common.calc')}: <b>{t('sheet.calc.manual', { v: show(override, signed) })}</b></div>
    <div class="was">
      {t('sheet.calc.autoWas')}
      {#each parts as p, i (i)}{#if i}&nbsp;+ {/if}{p.label} <b>{show(p.value, p.signed !== false)}</b>{#if p.suffix}&nbsp;{p.suffix}{/if}{/each}
      = <b>{show(total, signed)}</b>
    </div>
  {:else}
    {t('common.calc')}:
    {#each parts as p, i (i)}{#if i}&nbsp;+ {/if}{p.label} <b>{show(p.value, p.signed !== false)}</b>{#if p.suffix}&nbsp;{p.suffix}{/if}{/each}
    = <b>{show(total, signed)}</b>
  {/if}
</div>

<style>
  .calc {
    padding: 10px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--ink) 7%, transparent);
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--ink);
  }
  .was {
    color: var(--ink2);
    font-size: 12.5px;
    margin-top: 2px;
  }
  b {
    font-variant-numeric: tabular-nums;
  }
</style>
