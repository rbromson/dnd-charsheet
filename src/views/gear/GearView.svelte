<script lang="ts">
  import TopBar from '../../components/TopBar.svelte';
  import Icon from '../../components/Icon.svelte';
  import RowActions from '../../components/RowActions.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import ItemSheet from './ItemSheet.svelte';
  import ItemLibrary from './ItemLibrary.svelte';
  import ItemPowers from './ItemPowers.svelte';
  import AddChooser from '../../components/AddChooser.svelte';
  import { attunedCount, itemActive } from '../../lib/rules/calc';
  import { removeItem as removeItemWithAttack } from '../../lib/rules/weapons';
  import CoinSheet from './CoinSheet.svelte';
  import DeckCard from './DeckCard.svelte';
  import DeckReveal from './DeckReveal.svelte';
  import CoinDisc from './CoinDisc.svelte';
  import { COIN_KEYS, totalInGp, type CoinKey } from './coins';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { press } from '../../lib/actions/press';
  import { move } from '../../lib/list';
  import { uid } from '../../lib/model/ids';
  import { newItem } from '../../lib/model/defaults';
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
  /** «Додати»: з бібліотеки або вручну — у будь-якому режимі; предмет з'явиться лише після «Додати» в картці. */
  function addItem() {
    ui.openSheet(AddChooser, {
      kicker: t('gear.itemKicker'),
      title: t('add.item'),
      librarySub: t('add.itemLibSub'),
      manualSub: t('add.itemManualSub'),
      onlibrary: () => ui.openSheet(ItemLibrary, {}),
      onmanual: () => {
        const id = uid();
        c.equipment.push(newItem({ id, name: '' }));
        ui.openSheet(ItemSheet, { id, fresh: true });
      },
    });
  }
  async function removeItem(id: string) {
    const it = c.equipment.find((x) => x.id === id);
    if (!it) return;
    const name = it.name.trim() || t('gear.unnamed');
    const ok = await ui.confirm(t('gear.deleteItemConfirm', { name }), { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    charStore.update(
      (ch) => {
        removeItemWithAttack(ch, id);
      },
      { undo: t('gear.deleted', { name }) },
    );
  }

  function coinSheet(coin: CoinKey) {
    ui.openSheet(CoinSheet, { coin });
  }

  const itemDecks = $derived(c.decks.filter((d) => c.equipment.some((i) => i.deckId === d.id && i.id !== ui.draft)));
</script>

<TopBar title={t('nav.gear')}>
  <button class="btn btn-primary" onclick={addItem}><Icon name="plus" size={20} />{t('add.confirm')}</button>
</TopBar>
<div class="view">
  <div class="cols cols-3">
    <section class="card equip">
      <h2 class="card-title">{t('gear.equipment')}</h2>
      {#if c.equipment.some((i) => i.attune)}
        <div class="att" class:over={attunedCount(c) > 3}><Icon name="sparkle" size={14} stroke={2} />{t('gear.attuneCount', { n: attunedCount(c) })}</div>
      {/if}
      {#if c.equipment.length}
        <ul class="list">
          {#each c.equipment as it, i (it.id)}
            <li class:open={open[it.id] && !ui.editing} hidden={it.id === ui.draft}>
              <div class="line">
                <button
                  class="name"
                  use:press={{ onTap: () => tapItem(it.id), onLong: () => itemSheet(it.id) }}
                >
                  <span class="nm serif" class:unnamed={!it.name.trim()}
                    >{it.name.trim() || t('gear.unnamed')}{#if it.en && it.en !== it.name}<span class="en">{it.en}</span>{/if}</span
                  >
                  {#if c.attacks.some((a) => a.itemId === it.id)}
                    <span class="weapon" title={t('gear.weaponIn')}><Icon name="combat" size={15} /></span>
                  {/if}
                  {#if it.magic}
                    <span class="magic"><Icon name="sparkle" size={14} stroke={2} />{t('gear.magic')}</span>
                  {/if}
                  {#if it.attune && it.attuned}
                    <span class="badge on">{t('gear.attunedShort')}</span>
                  {/if}
                  {#if it.equipped && (it.armor || it.acBonus || it.saveBonus || it.setAbility)}
                    <span class="badge" class:on={itemActive(it)}><Icon name="shield" size={12} stroke={2.2} />{t('gear.equippedShort')}</span>
                  {/if}
                  {#if it.resourceId}
                    {@const r = c.resources.find((x) => x.id === it.resourceId)}
                    {#if r}<span class="badge chg num" title={t('pw.charges', { n: r.current, max: r.max })}><Icon name="sparkle" size={12} />{r.current}/{r.max}</span>{/if}
                  {/if}
                  <span class="qty num" class:zero={it.qty === 0}>×{it.qty}</span>
                  {#if !ui.editing && (it.text.trim() || it.powers.length)}
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
              {#if open[it.id] && !ui.editing}
                <!-- дії предмета (випити, заряди) — одразу під назвою, опис нижче -->
                {#if it.powers.length}<div class="pwbox"><ItemPowers itemId={it.id} /></div>{/if}
                {#if it.text.trim()}<div class="desc serif">{it.text}</div>{/if}
              {/if}
            </li>
          {/each}
        </ul>
      {:else}
        <div class="empty">{t('gear.emptyItems')}</div>
      {/if}
      <button class="btn btn-ghost addbtn" onclick={addItem}><Icon name="plus" size={20} />{t('gear.addItem')}</button>
      {#if !ui.editing && c.equipment.length}
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

      <!-- колоды — только у особых предметов (переключатель «Колода карт» в картке предмета) -->
      {#if itemDecks.length}
        <h2 class="section sc">{t('gear.decks')}</h2>
        {#each itemDecks as d (d.id)}
          <DeckCard id={d.id} onReveal={(r) => (reveal = r)} />
        {/each}
      {/if}
    </div>
  </div>
</div>

{#if reveal}
  <DeckReveal deck={reveal.deck} text={reveal.text} n={reveal.n} onclose={() => (reveal = null)} />
{/if}

<style>
  .pwbox {
    padding: 0 4px 8px;
  }
  .chg {
    gap: 3px;
  }
  .en {
    display: block;
    font-family: var(--font-sans);
    font-size: 11.5px;
    font-weight: 500;
    font-style: italic;
    color: var(--ink2);
  }
  .att {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--ink2);
    margin: -2px 0 6px;
  }
  .att.over {
    color: #8e2f20;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 10.5px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 6px;
    border: 1px solid var(--edge);
    color: var(--ink2);
    white-space: nowrap;
  }
  .badge.on {
    background: var(--ink);
    border-color: var(--ink);
    color: var(--parch);
  }
  .weapon {
    display: inline-flex;
    color: var(--ink2);
  }
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
    flex-wrap: wrap;
    gap: 2px 8px;
    text-align: left;
    user-select: none;
    -webkit-user-select: none;
  }
  .nm {
    flex: 1 1 55%;
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
</style>
