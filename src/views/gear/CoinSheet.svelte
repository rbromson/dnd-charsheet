<script lang="ts">
  /** Монеты одного вида: добавить / отнять сумму (с отменой) или задать точное значение. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import Icon from '../../components/Icon.svelte';
  import CoinDisc from './CoinDisc.svelte';
  import { applyCoinDelta, type CoinKey } from './coins';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui, buzz } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  let { coin }: { coin: CoinKey } = $props();

  const c = $derived(charStore.current);
  const have = $derived(c?.coins[coin] ?? 0);
  let amount = $state<number | null>(null);
  const n = $derived(Math.max(0, amount ?? 0));
  const QUICK = [1, 5, 10, 50, 100];

  function apply(sign: 1 | -1) {
    if (n <= 0) return;
    const label = t(`gear.coin.${coin}`);
    charStore.update(
      (ch) => {
        ch.coins[coin] = applyCoinDelta(ch.coins[coin], sign * n);
      },
      { undo: t(sign > 0 ? 'gear.coinAdded' : 'gear.coinSubbed', { n, coin: label }) },
    );
    buzz(15);
    ui.closeSheet();
  }

  function setExact(v: number | null) {
    if (c) c.coins[coin] = Math.max(0, v ?? 0);
  }
</script>

{#if c}
  <SheetFrame kicker={t('gear.coinKicker')} title={t(`gear.coinName.${coin}`)} value={String(have)}>
    <div class="top">
      <CoinDisc {coin} size={72} />
      <div class="grow">
        <NumberField bind:value={amount} nullable min={0} big label={t('gear.amount')} placeholder="0" />
      </div>
    </div>
    <div class="quick">
      {#each QUICK as q (q)}
        <button class="chip" class:on={amount === q} onclick={() => (amount = q)}>{q}</button>
      {/each}
    </div>
    <div class="acts">
      <button class="btn btn-danger big" disabled={n <= 0 || n > have} onclick={() => apply(-1)}>
        <Icon name="minus" size={22} />{t('gear.coinSub')}
      </button>
      <button class="btn btn-good big" disabled={n <= 0} onclick={() => apply(1)}>
        <Icon name="plus" size={22} />{t('gear.coinAdd')}
      </button>
    </div>
    {#if n > have}
      <div class="warn">{t('gear.coinNotEnough', { n: have })}</div>
    {/if}

    <div class="divider"></div>
    <NumberField value={have} min={0} label={t('gear.coinExact')} onchange={setExact} />

    {#snippet footer()}
      <div class="grow"></div>
      <button class="btn btn-ink" onclick={() => ui.closeSheet()}><Icon name="check" size={20} />{t('common.done')}</button>
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .top {
    display: flex;
    align-items: flex-end;
    gap: 14px;
  }
  .quick {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .quick .chip {
    min-height: var(--tap);
    min-width: 56px;
    justify-content: center;
    font-weight: 700;
  }
  .acts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .big {
    min-height: 56px;
    font-size: 16px;
  }
  .warn {
    font-size: 13px;
    color: var(--bad);
    text-align: center;
    margin-top: -6px;
  }
</style>
