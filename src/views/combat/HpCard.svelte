<script lang="ts">
  /** Здоров'я: крупные числа, полоса, своя цифровая клавиатура, шкода / лікування / тимчасові. */
  import Icon from '../../components/Icon.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import HpSheet from './HpSheet.svelte';
  import { press } from '../../lib/actions/press';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui, buzz } from '../../lib/stores/ui.svelte';
  import { applyDamage, applyHeal, setTemp } from '../../lib/rules/hp';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  let entry = $state('');
  const amount = $derived(entry === '' ? 0 : parseInt(entry, 10) || 0);

  const total = $derived(Math.max(1, c.hp.max, c.hp.current + c.hp.temp));
  const curPct = $derived((c.hp.current / total) * 100);
  const tmpPct = $derived((c.hp.temp / total) * 100);
  const down = $derived(c.hp.current === 0 && c.hp.max > 0);

  const explain = $derived.by(() => {
    if (!amount) return '';
    const hp = c.hp;
    if (hp.temp > 0) {
      if (amount <= hp.temp) return t('combat.dmgTempAll', { from: hp.temp, to: hp.temp - amount });
      return t('combat.dmgTempSplit', { from: hp.temp, rest: amount - hp.temp });
    }
    return t('combat.dmgPreview', { from: hp.current, to: applyDamage(hp, amount).current });
  });

  function key(k: string) {
    buzz(8);
    if (k === 'C') entry = '';
    else if (k === '⌫') entry = entry.slice(0, -1);
    else if (entry.length < 4) entry = entry === '0' ? k : entry + k;
  }

  function damage() {
    const n = amount;
    if (!n) return;
    const from = c.hp.current;
    const next = applyDamage(c.hp, n);
    charStore.update(
      (ch) => {
        ch.hp = next;
      },
      { undo: t('combat.toastDamage', { n, from, to: next.current }) },
    );
    buzz([20, 30, 40]);
    entry = '';
  }

  function heal() {
    const n = amount;
    if (!n) return;
    const from = c.hp.current;
    const next = applyHeal(c.hp, n);
    charStore.update(
      (ch) => {
        ch.hp = next;
        // 5e: получив хиты, персонаж приходит в себя — счётчики рятунку от смерті обнуляются
        if (from === 0 && next.current > 0) ch.deathSaves = { success: 0, fail: 0 };
      },
      { undo: t('combat.toastHeal', { n, from, to: next.current }) },
    );
    buzz(15);
    entry = '';
  }

  function temp() {
    const n = amount;
    if (!n) return;
    const next = setTemp(c.hp, n);
    charStore.update(
      (ch) => {
        ch.hp = next;
      },
      { undo: t('combat.toastTemp', { n: next.temp }) },
    );
    buzz(15);
    entry = '';
  }

  const openSheet = () => ui.openSheet(HpSheet, {});
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];
</script>

<section class="card hp" class:down>
  <div class="head">
    <h3 class="card-title">{t('combat.hp')}</h3>
    {#if down}<span class="downtag">{t('combat.down')}</span>{/if}
  </div>

  {#if ui.editing}
    <div class="edit3">
      <NumberField label={t('combat.hpCurrent')} bind:value={c.hp.current} min={0} max={c.hp.max} big />
      <NumberField label={t('combat.hpMax')} bind:value={c.hp.max} min={0} max={999} big />
      <NumberField label={t('combat.hpTemp')} bind:value={c.hp.temp} min={0} max={999} big />
    </div>
  {:else}
    <button class="hpbig" use:press={{ onLong: openSheet }} aria-label={t('combat.hpEditHint')}>
      <span class="cur num">{c.hp.current}</span>
      <span class="max num">/ {c.hp.max}</span>
      {#if c.hp.temp > 0}<span class="tmp">{t('combat.tempBadge', { n: c.hp.temp })}</span>{/if}
    </button>
  {/if}
  <div class="bar" aria-hidden="true">
    <div class="a" style:width="{curPct}%"></div>
    <div class="b" style:width="{tmpPct}%"></div>
  </div>

  <div class="divider"></div>

  <div class="amount num" class:empty={!amount}>{amount}</div>
  <div class="explain">{explain || ' '}</div>

  <div class="pad">
    {#each keys as k (k)}
      <button class="key" class:fn={k === 'C' || k === '⌫'} onclick={() => key(k)} aria-label={k === 'C' ? t('combat.clear') : k === '⌫' ? t('combat.backspace') : k}>
        {k}
      </button>
    {/each}
  </div>

  <div class="acts">
    <button class="btn btn-danger" disabled={!amount} onclick={damage}><Icon name="minus" size={20} stroke={2.4} />{t('combat.damage')}</button>
    <button class="btn btn-good" disabled={!amount} onclick={heal}><Icon name="plus" size={20} stroke={2.4} />{t('combat.heal')}</button>
    <button class="btn btn-temp" disabled={!amount} onclick={temp}><Icon name="shield" size={18} />{t('combat.tempBtn')}</button>
  </div>
</section>

<style>
  .hp {
    display: flex;
    flex-direction: column;
  }
  .hp.down {
    box-shadow:
      inset 0 0 0 2px var(--bad),
      inset 0 0 30px color-mix(in srgb, var(--bad) 18%, transparent),
      0 2px 8px color-mix(in srgb, var(--bg) 70%, transparent);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .downtag {
    font-size: 12px;
    font-weight: 700;
    color: var(--parch3);
    background: var(--bad);
    border-radius: 8px;
    padding: 3px 8px;
    margin-bottom: 8px;
  }
  .hpbig {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-height: var(--tap);
    text-align: left;
    color: var(--ink);
    user-select: none;
    flex-wrap: wrap;
  }
  .cur {
    font-size: 64px;
    line-height: 1;
  }
  .down .cur {
    color: var(--bad);
  }
  .max {
    font-size: 24px;
    color: var(--ink2);
  }
  .tmp {
    font-size: 13px;
    font-weight: 600;
    background: var(--temp);
    color: var(--parch3);
    border-radius: 10px;
    padding: 3px 9px;
    margin-left: 6px;
    align-self: center;
  }
  .edit3 {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    align-items: end;
  }
  .bar {
    height: 10px;
    border-radius: 5px;
    background: color-mix(in srgb, var(--ink) 15%, transparent);
    margin: 8px 0 2px;
    overflow: hidden;
    display: flex;
  }
  .bar .a {
    background: linear-gradient(90deg, var(--good), color-mix(in srgb, var(--good) 70%, var(--parch)));
    transition: width 0.25s;
  }
  .bar .b {
    background: var(--temp);
    transition: width 0.25s;
  }
  .divider {
    margin: 12px 0;
  }
  .amount {
    font-size: 72px;
    line-height: 1;
    text-align: center;
    color: var(--ink);
  }
  @media (max-width: 640px) {
    .amount {
      font-size: 54px;
    }
    .divider {
      margin: 8px 0;
    }
  }
  .amount.empty {
    color: color-mix(in srgb, var(--ink2) 45%, transparent);
  }
  .explain {
    text-align: center;
    font-size: 12.5px;
    color: var(--ink2);
    margin: 4px 0 10px;
    min-height: 1.5em;
  }
  .pad {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .key {
    height: 56px;
    border-radius: 12px;
    background: var(--parch3);
    box-shadow: inset 0 0 0 1px var(--edge);
    font-size: 22px;
    font-weight: 600;
    color: var(--ink);
    user-select: none;
  }
  .key:active {
    background: var(--edge);
  }
  .key.fn {
    font-size: 18px;
    color: var(--ink2);
  }
  .acts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 10px;
  }
  .acts .btn {
    min-height: 56px;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 700;
    padding: 0 10px;
    gap: 6px;
  }
  .acts .btn-temp {
    grid-column: span 2;
    min-height: var(--tap);
    font-size: 14.5px;
    background: var(--temp);
    color: var(--parch3);
  }
</style>
