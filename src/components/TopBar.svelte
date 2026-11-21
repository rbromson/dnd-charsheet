<script lang="ts">
  import Icon from './Icon.svelte';
  import Segmented from './Segmented.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import Portrait from './Portrait.svelte';
  import { charStore } from '../lib/stores/characters.svelte';
  import { t } from '../lib/i18n';
  import type { Snippet } from 'svelte';

  let { title, children }: { title: string; children?: Snippet } = $props();
</script>

<header class="top" class:editing={ui.editing}>
  <button class="who" aria-label={t('nav.characters')} onclick={() => (ui.switcherOpen = !ui.switcherOpen)}>
    <Portrait id={charStore.current?.portraitId ?? null} name={charStore.current?.name ?? ''} size={40} />
  </button>
  <h1 class="sc">{title}</h1>
  {#if ui.editing}<span class="hint"><Icon name="edit" size={16} />{t('mode.editHint')}</span>{/if}
  <div class="grow"></div>
  {#if children}<div class="extra">{@render children()}</div>{/if}
  <button class="ib dice" class:on={ui.diceTrayOpen} aria-label={t('nav.dice')} onclick={() => (ui.diceTrayOpen = !ui.diceTrayOpen)}><Icon name="dice" size={22} /></button>
  <button class="ib qn" aria-label={t('nav.quickNote')} onclick={() => (ui.quickNoteOpen = true)}><Icon name="feather" size={22} stroke={2} /></button>
  <button
    class="ib pen"
    class:on={ui.editing}
    aria-pressed={ui.editing}
    aria-label={ui.editing ? t('mode.play') : t('mode.edit')}
    onclick={() => (ui.mode = ui.editing ? 'play' : 'edit')}><Icon name={ui.editing ? 'check' : 'edit'} size={22} /></button
  >
  <div class="mode">
    <Segmented
      bind:value={ui.mode}
      options={[
        { value: 'play', label: t('mode.play') },
        { value: 'edit', label: t('mode.edit') },
      ]}
    />
  </div>
</header>

<style>
  .top {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    min-height: 68px;
    background: rgba(23, 17, 14, 0.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid transparent;
  }
  .top.editing {
    border-bottom-color: var(--ember);
  }
  h1 {
    font-size: 22px;
    color: var(--parch);
  }
  .hint {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--ember);
  }
  .mode {
    width: 210px;
  }
  .extra {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  @media (max-width: 1000px) {
    .top {
      flex-wrap: wrap;
      row-gap: 8px;
    }
    .hint {
      display: none;
    }
    .extra {
      order: 3;
      width: 100%;
      justify-content: flex-start;
    }
  }
  .who,
  .ib {
    display: none;
  }
  .ib {
    width: var(--tap);
    height: var(--tap);
    border-radius: 14px;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--text);
    background: var(--bg3);
    border: 1px solid var(--line2);
  }
  .ib.qn {
    background: var(--ember);
    color: var(--ember-ink);
    border-color: var(--ember);
  }
  .ib.dice.on,
  .ib.pen.on {
    background: var(--ember-soft);
    color: var(--ember);
    border-color: var(--ember);
  }
  @media (max-width: 640px) {
    .top {
      padding: 8px 12px;
      min-height: 60px;
      gap: 10px;
    }
    .who {
      display: flex;
      border-radius: 50%;
    }
    h1 {
      font-size: 19px;
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .top > .grow {
      display: none;
    }
    .mode {
      display: none;
    }
    .ib {
      display: flex;
    }
    .extra {
      justify-content: stretch;
    }
    .extra > :global(*) {
      flex: 1;
    }
  }
</style>
