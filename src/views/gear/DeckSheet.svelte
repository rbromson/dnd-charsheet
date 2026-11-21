<script lang="ts">
  /** Карточка колоды: название, карты (одна на строку), удаление. */
  import { untrack } from 'svelte';
  import SheetFrame from '../../components/SheetFrame.svelte';
  import TextField from '../../components/TextField.svelte';
  import Icon from '../../components/Icon.svelte';
  import { parseCards, sameCards } from './deck';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  let { id }: { id: string } = $props();

  const deck = $derived(charStore.current?.decks.find((x) => x.id === id));
  let text = $state(untrack(() => deck?.cards.join('\n') ?? ''));
  const count = $derived(parseCards(text).length);

  // Любая правка списка карт возвращает все карты в колоду.
  $effect(() => {
    const cards = parseCards(text);
    untrack(() => {
      if (deck && !sameCards(cards, deck.cards)) {
        deck.cards = cards;
        deck.drawn = [];
      }
    });
  });

  async function remove() {
    if (!deck) return;
    const name = deck.name.trim() || t('gear.unnamed');
    const ok = await ui.confirm(t('gear.deleteDeckConfirm', { name }), { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    ui.closeSheet();
    charStore.update(
      (ch) => {
        ch.decks = ch.decks.filter((x) => x.id !== id);
      },
      { undo: t('gear.deckDeleted') },
    );
  }
</script>

{#if deck}
  <SheetFrame kicker={t('gear.deckKicker')} title={deck.name.trim() || t('gear.unnamed')} value={String(deck.cards.length)}>
    <TextField bind:value={deck.name} label={t('common.name')} serif />
    <TextField bind:value={text} label={t('gear.cards')} placeholder={t('gear.cardsPlaceholder')} multiline rows={10} serif />
    <div class="meta">
      <b>{t('gear.cardsCount', { n: count })}</b>
      <span class="muted">{t('gear.cardsResetHint')}</span>
    </div>

    {#snippet footer()}
      <button class="btn btn-danger" onclick={remove}><Icon name="trash" size={20} />{t('common.delete')}</button>
      <div class="grow"></div>
      <button class="btn btn-ink" onclick={() => ui.closeSheet()}><Icon name="check" size={20} />{t('common.done')}</button>
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    margin-top: -6px;
  }
</style>
