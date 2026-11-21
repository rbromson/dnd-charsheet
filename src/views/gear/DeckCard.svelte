<script lang="ts">
  /** Колода на столе: тап по верхней карте / кнопка — вытянуть случайную карту. */
  import Icon from '../../components/Icon.svelte';
  import CardBack from './CardBack.svelte';
  import DeckSheet from './DeckSheet.svelte';
  import { drawIndex, remainingIndices } from './deck';
  import { cryptoRng } from '../../lib/dice/rng';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui, buzz } from '../../lib/stores/ui.svelte';
  import { press } from '../../lib/actions/press';
  import { t } from '../../lib/i18n';

  let { id, onReveal }: { id: string; onReveal: (r: { deck: string; text: string; n: number }) => void } = $props();

  const deck = $derived(charStore.current?.decks.find((x) => x.id === id));
  const total = $derived(deck?.cards.length ?? 0);
  const left = $derived(deck ? remainingIndices(deck).length : 0);
  /** Вытянутые карты, последние сверху */
  const drawn = $derived(
    deck
      ? deck.drawn
          .map((i) => deck.cards[i])
          .filter((x) => x != null)
          .reverse()
      : [],
  );
  let showDrawn = $state(false);

  function settings() {
    ui.openSheet(DeckSheet, { id });
  }

  function draw() {
    if (!deck) return;
    const idx = drawIndex(deck, cryptoRng);
    if (idx == null) return;
    deck.drawn.push(idx);
    buzz([10, 40, 25]);
    onReveal({ deck: deck.name.trim() || t('gear.unnamed'), text: deck.cards[idx], n: deck.drawn.length });
  }

  async function returnAll() {
    if (!deck) return;
    const ok = await ui.confirm(t('gear.returnAllConfirm', { name: deck.name.trim() || t('gear.unnamed') }), {
      okLabel: t('gear.returnAll'),
    });
    if (!ok) return;
    charStore.update(
      (ch) => {
        const d = ch.decks.find((x) => x.id === id);
        if (d) d.drawn = [];
      },
      { undo: t('gear.returned') },
    );
  }
</script>

{#if deck}
  <section class="card deck">
    <header>
      <button
        class="hd grow"
        use:press={{ onTap: () => ui.editing && settings(), onLong: settings }}
      >
        <span class="nm serif">{deck.name.trim() || t('gear.unnamed')}</span>
        <span class="sub">{t('gear.deckLeft', { left, total })}</span>
      </button>
      {#if ui.editing}
        <button class="btn btn-ghost" aria-label={t('common.edit')} onclick={settings}><Icon name="edit" size={20} /></button>
      {/if}
    </header>

    {#if total === 0}
      <p class="hint">{t('gear.deckEmpty')}</p>
    {:else}
      <div class="table">
        <button class="pile" class:out={left === 0} disabled={left === 0 || ui.editing} aria-label={t('gear.cardBackAria')} onclick={draw}>
          {#if left > 2}<span class="layer l3"></span>{/if}
          {#if left > 1}<span class="layer l2"></span>{/if}
          {#if left > 0}
            <span class="layer top"><CardBack emblem={20} /></span>
          {:else}
            <span class="layer ghost"></span>
          {/if}
        </button>
        <div class="acts">
          {#if left > 0}
            <button class="btn btn-primary drawbtn" disabled={ui.editing} onclick={draw}>
              <Icon name="cards" size={22} />{t('gear.draw')}
            </button>
          {:else}
            <div class="out-msg">{t('gear.deckOut')}</div>
          {/if}
          {#if deck.drawn.length > 0}
            <button class="btn btn-outline" onclick={returnAll}><Icon name="undo" size={20} />{t('gear.returnAll')}</button>
          {/if}
        </div>
      </div>

      {#if drawn.length}
        <button class="drawn-toggle" aria-expanded={showDrawn} onclick={() => (showDrawn = !showDrawn)}>
          <span class="grow">{t('gear.drawnList', { n: drawn.length })}</span>
          <span class="chev" class:open={showDrawn}><Icon name="down" size={18} /></span>
        </button>
        {#if showDrawn}
          <ol class="drawn">
            {#each drawn as card, i (i)}
              <li class="serif">{card}</li>
            {/each}
          </ol>
        {/if}
      {/if}
    {/if}
  </section>
{/if}

<style>
  .deck {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .hd {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    min-height: var(--tap);
    justify-content: center;
    user-select: none;
    -webkit-user-select: none;
  }
  .nm {
    font-size: 19px;
    font-weight: 700;
    line-height: 1.2;
  }
  .sub {
    font-size: 12.5px;
    color: var(--ink2);
  }
  .hint {
    margin: 0;
    font-size: 13.5px;
    color: var(--ink2);
    line-height: 1.5;
  }
  .table {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .pile {
    position: relative;
    width: 76px;
    height: 104px;
    flex-shrink: 0;
    margin: 4px 6px 6px 0;
  }
  .pile[disabled] {
    opacity: 1;
  }
  .layer {
    position: absolute;
    inset: 0;
    border-radius: 9px;
    background: var(--rail);
    box-shadow:
      inset 0 0 0 1px var(--line2),
      0 2px 5px rgba(0, 0, 0, 0.35);
  }
  .l3 {
    transform: translate(6px, 6px) rotate(3deg);
  }
  .l2 {
    transform: translate(3px, 3px) rotate(1.5deg);
  }
  .top {
    overflow: hidden;
    transition: transform 0.12s;
  }
  .pile:not([disabled]):active .top {
    transform: translateY(-4px) rotate(-2deg);
  }
  .ghost {
    background: transparent;
    box-shadow: none;
    border: 1.5px dashed var(--ink2);
    opacity: 0.6;
  }
  .acts {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .drawbtn {
    min-height: 56px;
    font-size: 16px;
  }
  .out-msg {
    font-size: 14px;
    color: var(--ink2);
    font-weight: 600;
  }
  .drawn-toggle {
    display: flex;
    align-items: center;
    min-height: var(--tap);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink2);
    border-top: 1px solid rgba(107, 90, 72, 0.25);
    text-align: left;
  }
  .chev {
    display: flex;
    transition: transform 0.15s;
  }
  .chev.open {
    transform: rotate(180deg);
  }
  .drawn {
    margin: 0;
    padding: 0 0 4px 22px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 15.5px;
  }
</style>
