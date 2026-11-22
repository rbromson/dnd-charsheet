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
    background: linear-gradient(180deg, rgba(23, 17, 14, 0.94), rgba(23, 17, 14, 0.82));
    backdrop-filter: blur(14px) saturate(1.2);
    -webkit-backdrop-filter: blur(14px) saturate(1.2);
  }
  /* нижняя «золотая нить»; в режиме правки — горит угольком */
  .top::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(201, 179, 138, 0.28) 20%, rgba(201, 179, 138, 0.28) 80%, transparent);
    transition: background 0.3s;
  }
  .top.editing::after {
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--ember) 15%, var(--ember) 85%, transparent);
    box-shadow: 0 0 12px var(--ember-glow);
  }
  h1 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 24px;
    letter-spacing: 0.02em;
    color: var(--parch);
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6), 0 0 24px rgba(232, 116, 59, 0.18);
  }
  h1::before {
    content: '';
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    transform: rotate(45deg);
    background: linear-gradient(135deg, var(--gold), var(--ember));
    box-shadow: 0 0 10px var(--ember-glow);
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
    border-radius: 2px;
    clip-path: polygon(7px 0, calc(100% - 7px) 0, 100% 7px, 100% calc(100% - 7px), calc(100% - 7px) 100%, 7px 100%, 0 calc(100% - 7px), 0 7px);
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--parch);
    background: var(--pores), linear-gradient(180deg, #3d2c21, #241812);
    background-size: 140px 140px, 100% 100%;
    border: none;
    box-shadow: inset 0 1px 0 rgba(255, 220, 180, 0.06);
    transition:
      transform 0.15s var(--ease-spring),
      background 0.2s,
      color 0.2s;
  }
  .ib:active {
    transform: scale(0.9);
  }
  /* сургучная печать */
  .ib.qn {
    clip-path: none;
    border-radius: 47% 53% 50% 50% / 52% 46% 54% 48%;
    background: radial-gradient(circle at 36% 30%, #f6a36c, var(--ember) 45%, #a8401a 80%, #7a2a10);
    color: #3a1206;
    border: none;
    box-shadow:
      inset 0 1px 0 rgba(255, 225, 200, 0.55),
      0 4px 14px -4px var(--ember-glow);
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
      padding: 2px;
      background: conic-gradient(from 200deg, #6b4a2c, #e6b450, #8a5a30, #e8743b, #6b4a2c);
    }
    h1::before {
      display: none;
    }
    h1 {
      display: block;
      font-size: 20px;
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
