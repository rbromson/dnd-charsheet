<script lang="ts">
  import TopBar from '../../components/TopBar.svelte';
  import Icon from '../../components/Icon.svelte';
  import RowActions from '../../components/RowActions.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import ItemSheet from './ItemSheet.svelte';
  import CoinSheet from './CoinSheet.svelte';
  import DeckSheet from './DeckSheet.svelte';
  import DeckCard from './DeckCard.svelte';
  import DeckReveal from './DeckReveal.svelte';
  import CoinDisc from './CoinDisc.svelte';
  import { COIN_KEYS, totalInGp, type CoinKey } from './coins';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { press } from '../../lib/actions/press';
  import { move } from '../../lib/list';
  import { uid } from '../../lib/model/ids';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  const total = $derived(totalInGp(c.coins));

  let open = $state<Record<string, boolean>>({});
  let reveal = $state<{ deck: string; text: string; n: number } | null>(null);

  function itemSheet(id: string) {
    ui.openSheet(ItemSheet, { id });
  }
  function tapItem(id: string) {
    if (ui.editing) itemSheet(id);
    else open[id] = !open[id];
  }
  function addItem() {
    const id = uid();
    c.equipment.push({ id, name: '', qty: 1, text: '', magic: false });
    itemSheet(id);
  }
  async function removeItem(id: string) {
    const it = c.equipment.find((x) => x.id === id);
    if (!it) return;
    const name = it.name.trim() || t('gear.unnamed');
    const ok = await ui.confirm(t('gear.deleteItemConfirm', { name }), { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    charStore.update(
      (ch) => {
        ch.equipment = ch.equipment.filter((x) => x.id !== id);
      },
      { undo: t('gear.deleted', { name }) },
    );
  }

  function coinSheet(coin: CoinKey) {
    ui.openSheet(CoinSheet, { coin });
  }

  function addDeck() {
    const id = uid();
    c.decks.push({ id, name: t('gear.newDeck'), cards: [], drawn: [] });
    ui.openSheet(DeckSheet, { id });
  }
</script>

<TopBar title={t('nav.gear')} />
<div class="view">
  <div class="cols cols-3">
    <section class="card equip">
      <h2 class="card-title">{t('gear.equipment')}</h2>
      {#if c.equipment.length}
        <ul class="list">
          {#each c.equipment as it, i (it.id)}
            <li class:open={open[it.id] && !ui.editing}>
              <div class="line">
                <button
                  class="name"
                  use:press={{ onTap: () => tapItem(it.id), onLong: () => itemSheet(it.id) }}
                  onclick={(e) => {
                    if (e.detail === 0) tapItem(it.id);
                  }}
                >
                  <span class="nm serif" class:unnamed={!it.name.trim()}>{it.name.trim() || t('gear.unnamed')}</span>
                  {#if it.magic}
                    <span class="magic"><Icon name="sparkle" size={14} stroke={2} />{t('gear.magic')}</span>
                  {/if}
                  <span class="qty num" class:zero={it.qty === 0}>×{it.qty}</span>
                  {#if !ui.editing && it.text.trim()}
                    <span class="chev"><Icon name="down" size={18} /></span>
                  {/if}
                </button>
                {#if ui.editing}
                  <RowActions
                    onUp={i > 0 ? () => move(c.equipment, i, -1) : undefined}
                    onDown={i < c.equipment.length - 1 ? () => move(c.equipment, i, 1) : undefined}
                    onDelete={() => removeItem(it.id)}
                  />
                {/if}
              </div>
              {#if open[it.id] && !ui.editing && it.text.trim()}
                <div class="desc serif">{it.text}</div>
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <div class="empty">{t('gear.emptyItems')}</div>
      {/if}
      {#if ui.editing}
        <button class="btn btn-ghost addbtn" onclick={addItem}><Icon name="plus" size={20} />{t('gear.addItem')}</button>
      {:else if c.equipment.length}
        <p class="foot muted">{t('gear.itemHint')}</p>
      {/if}
    </section>

    <div class="stack">
      <section class="card">
        <h2 class="card-title">{t('gear.coins')}</h2>
        <div class="coins">
          {#each COIN_KEYS as k (k)}
            {#if ui.editing}
              <div class="coin">
                <CoinDisc coin={k} size={48} />
                <NumberField value={c.coins[k]} min={0} onchange={(v) => (c.coins[k] = Math.max(0, v ?? 0))} />
              </div>
            {:else}
              <button class="coin" aria-label={t(`gear.coinName.${k}`)} onclick={() => coinSheet(k)}>
                <CoinDisc coin={k} size={52} />
                <span class="amt num">{c.coins[k]}</span>
              </button>
            {/if}
          {/each}
        </div>
        <div class="total muted">{t('gear.coinsTotal', { v: total.toLocaleString('uk-UA') })}</div>
      </section>

      <h2 class="section sc">{t('gear.decks')}</h2>
      {#each c.decks as d (d.id)}
        <DeckCard id={d.id} onReveal={(r) => (reveal = r)} />
      {:else}
        <div class="nodecks">{t('gear.emptyDecks')}</div>
      {/each}
      {#if ui.editing}
        <button class="btn btn-outline" onclick={addDeck}><Icon name="plus" size={20} />{t('gear.addDeck')}</button>
      {/if}
    </div>
  </div>
</div>

{#if reveal}
  <DeckReveal deck={reveal.deck} text={reveal.text} n={reveal.n} onclose={() => (reveal = null)} />
{/if}

<style>
  @container (min-width: 1040px) {
    .equip {
      grid-column: span 2;
    }
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    border-bottom: 1px solid rgba(107, 90, 72, 0.2);
  }
  li:last-child {
    border-bottom: none;
  }
  .line {
    display: flex;
    align-items: center;
    min-height: 56px;
  }
  .name {
    flex: 1;
    min-width: 0;
    min-height: 56px;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    user-select: none;
    -webkit-user-select: none;
  }
  .nm {
    flex: 1;
    min-width: 0;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.25;
    padding: 6px 0;
  }
  .nm.unnamed {
    color: var(--ink2);
    font-style: italic;
  }
  .magic {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 3px 8px 3px 6px;
    border-radius: 8px;
    background: var(--ember);
    color: var(--ember-ink);
    white-space: nowrap;
  }
  .qty {
    font-size: 18px;
    min-width: 40px;
    text-align: right;
  }
  .qty.zero {
    color: var(--bad);
  }
  .chev {
    display: flex;
    color: var(--ink2);
    transition: transform 0.15s;
  }
  li.open .chev {
    transform: rotate(180deg);
  }
  .desc {
    white-space: pre-wrap;
    font-size: 15.5px;
    line-height: 1.55;
    padding: 0 4px 12px;
  }
  .addbtn {
    margin-left: -10px;
  }
  .foot {
    font-size: 12.5px;
    margin: 8px 0 0;
  }

  .coins {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 6px;
  }
  .coin {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    min-height: var(--tap);
    padding: 4px 0;
    border-radius: 12px;
    min-width: 0;
  }
  button.coin:active {
    background: rgba(42, 31, 23, 0.08);
  }
  .coin :global(input) {
    padding: 8px 2px;
    font-size: 16px;
  }
  .amt {
    font-size: 26px;
    line-height: 1;
  }
  .total {
    margin-top: 8px;
    font-size: 12.5px;
    text-align: right;
  }

  .section {
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 6px 2px -4px;
  }
  .nodecks {
    font-size: 13.5px;
    color: var(--muted);
    line-height: 1.5;
    padding: 4px 2px;
  }
</style>
