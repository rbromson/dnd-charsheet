<script lang="ts">
  /** Рятунок від смерті: 3 успіхи + 3 провали, тап — переключить, «Кинути» — d20. Крупно, когда хиты = 0. */
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { buzz } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  const down = $derived(c.hp.current === 0 && c.hp.max > 0);
  const ds = $derived(c.deathSaves);

  function tap(kind: 'success' | 'fail', i: number) {
    const cur = c.deathSaves[kind];
    c.deathSaves[kind] = i < cur ? i : i + 1;
    buzz(10);
  }

  const status = $derived(ds.success >= 3 ? t('combat.stable') : ds.fail >= 3 ? t('combat.dead') : '');
</script>

<section class="card ds" class:down>
  {#if down}
    <h3 class="card-title big">{t('combat.death')}</h3>
    <div class="groups">
      <div class="grp">
        <span class="label">{t('combat.deathSuccess')}</span>
        <div class="circles">
          {#each [0, 1, 2] as i (i)}
            <button class="circ ok" class:on={i < ds.success} aria-label={`${t('combat.deathSuccess')} ${i + 1}`} onclick={() => tap('success', i)}
              ><span></span></button
            >
          {/each}
        </div>
      </div>
      <div class="grp">
        <span class="label">{t('combat.deathFail')}</span>
        <div class="circles">
          {#each [0, 1, 2] as i (i)}
            <button class="circ ko" class:on={i < ds.fail} aria-label={`${t('combat.deathFail')} ${i + 1}`} onclick={() => tap('fail', i)}
              ><span></span></button
            >
          {/each}
        </div>
      </div>
    </div>
    {#if status}<div class="status" class:bad={ds.fail >= 3}>{status}</div>{/if}
    <button class="btn btn-danger roll" onclick={() => dice.rollDeathSave(t('combat.death'))}>
      <Icon name="dice" size={22} />{t('combat.deathRoll')}
    </button>
    <div class="hint">{t('combat.deathHint')}</div>
  {:else}
    <div class="compact">
      <div class="grow">
        <div class="n">{t('combat.death')}</div>
        <div class="d">{status || `${t('combat.deathSuccess').toLowerCase()} · ${t('combat.deathFail').toLowerCase()}`}</div>
      </div>
      <div class="circles">
        {#each [0, 1, 2] as i (i)}
          <button class="circ sm ok" class:on={i < ds.success} aria-label={`${t('combat.deathSuccess')} ${i + 1}`} onclick={() => tap('success', i)}
            ><span></span></button
          >
        {/each}
        <span class="gap"></span>
        {#each [0, 1, 2] as i (i)}
          <button class="circ sm ko" class:on={i < ds.fail} aria-label={`${t('combat.deathFail')} ${i + 1}`} onclick={() => tap('fail', i)}
            ><span></span></button
          >
        {/each}
      </div>
    </div>
  {/if}
</section>

<style>
  .ds.down {
    box-shadow:
      inset 0 0 0 2px var(--bad),
      inset 0 0 40px color-mix(in srgb, var(--bad) 22%, transparent),
      0 0 24px color-mix(in srgb, var(--bad) 35%, transparent);
  }
  .big {
    font-size: 16px;
    color: var(--bad);
  }
  .groups {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }
  .grp {
    flex: 1;
    min-width: 150px;
  }
  .circles {
    display: flex;
    align-items: center;
  }
  .gap {
    width: 10px;
  }
  .circ {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .circ span {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 2px solid var(--ink2);
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .circ.sm {
    width: var(--tap);
    height: var(--tap);
  }
  .circ.sm span {
    width: 32px;
    height: 32px;
  }
  .circ.ok.on span {
    background: var(--good);
    border-color: var(--good);
  }
  .circ.ko.on span {
    background: var(--bad);
    border-color: var(--bad);
  }
  .status {
    margin-top: 8px;
    font-weight: 700;
    color: var(--good);
  }
  .status.bad {
    color: var(--bad);
  }
  .roll {
    width: 100%;
    margin-top: 12px;
    min-height: 56px;
    font-size: 17px;
  }
  .hint {
    text-align: center;
    font-size: 12px;
    color: var(--ink2);
    margin-top: 6px;
  }
  .compact {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .n {
    font-weight: 600;
    font-size: 15px;
  }
  .d {
    font-size: 12px;
    color: var(--ink2);
  }
</style>
