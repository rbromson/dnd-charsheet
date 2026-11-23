<script lang="ts">
  /**
   * Опір, імунітет, вразливість. Свої (дварф — отрута, тифлінг — вогонь) вписуються тут тапом по типу;
   * від предметів і зілль — лише показуються, вони діють самі, поки предмет надітий.
   */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { DAMAGE_TYPES, defenses, parseDef, type DefKind } from '../../lib/rules/defense';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  const own = (type: string): DefKind | null => {
    for (const x of c.defenses) {
      const d = parseDef(x);
      if (d?.type === type) return d.kind;
    }
    return null;
  };
  const NEXT: Record<string, DefKind | null> = { none: 'resist', resist: 'immune', immune: 'vuln', vuln: null };
  function cycle(type: string) {
    const next = NEXT[own(type) ?? 'none'];
    c.defenses = [...c.defenses.filter((x) => parseDef(x)?.type !== type), ...(next ? [`${next}:${type}`] : [])];
  }
  const fromItems = $derived(defenses({ ...c, defenses: [] }));
</script>

{#if c}
  <SheetFrame kicker={t('combat.hpKicker')} title={t('def.title')}>
    <span class="label">{t('def.own')}</span>
    <p class="hint">{t('def.ownHint')}</p>
    <div class="grid">
      {#each DAMAGE_TYPES as dt (dt)}
        {@const k = own(dt)}
        <button class="chip {k ?? ''}" aria-pressed={!!k} onclick={() => cycle(dt)}>
          <span class="nm">{t(`dmg.${dt}`)}</span>
          {#if k}<span class="k">{t(`def.${k}`)}</span>{/if}
        </button>
      {/each}
    </div>
    {#if fromItems.length}
      <span class="label">{t('def.items')}</span>
      {#each fromItems as d (d.type)}
        <div class="ln">
          <b>{t(`dmg.${d.type}`)}</b> — {[d.immune ? t('def.immune') : d.resist ? t('def.resist') : '', d.vuln ? t('def.vuln') : ''].filter(Boolean).join(', ')}
          <span class="src">· {d.sources.join(', ')}</span>
        </div>
      {/each}
    {/if}
    {#snippet footer()}
      <button class="btn btn-outline grow" onclick={() => ui.closeSheet()}>{t('common.done')}</button>
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .hint {
    margin: -4px 0 4px;
    font-size: 12.5px;
    color: var(--ink2);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 6px;
  }
  .chip {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 1px;
    min-height: 46px;
    padding: 4px 10px;
    border-radius: 3px;
    text-align: left;
    color: var(--ink);
    background: rgba(42, 31, 23, 0.05);
    box-shadow: inset 0 0 0 1px rgba(150, 112, 62, 0.35);
  }
  .nm {
    font-size: 14px;
  }
  .k {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .chip.resist {
    background: color-mix(in srgb, var(--temp) 16%, transparent);
    box-shadow: inset 0 0 0 1.5px var(--temp);
  }
  .chip.resist .k {
    color: var(--temp);
  }
  .chip.immune {
    background: linear-gradient(180deg, rgba(240, 199, 102, 0.35), rgba(154, 106, 42, 0.2));
    box-shadow: inset 0 0 0 1.5px #9a6a2a;
  }
  .chip.immune .k {
    color: #7a4f18;
  }
  .chip.vuln {
    background: color-mix(in srgb, var(--bad) 12%, transparent);
    box-shadow: inset 0 0 0 1.5px var(--bad);
  }
  .chip.vuln .k {
    color: var(--bad);
  }
  .ln {
    font-size: 14px;
  }
  .src {
    color: var(--ink2);
    font-size: 12.5px;
  }
</style>
