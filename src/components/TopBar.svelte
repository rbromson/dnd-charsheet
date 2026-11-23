<script lang="ts">
  import Icon from './Icon.svelte';
  import Segmented from './Segmented.svelte';
  import SectionTips from './SectionTips.svelte';
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
  <button class="ib qn" aria-label={t('nav.quickNote')} onclick={() => (ui.quickNoteOpen = true)}><Icon name="feather" size={22} stroke={2} /></button>
  <button
    class="ib pen"
    class:on={ui.editing}
    aria-pressed={ui.editing}
    aria-label={ui.editing ? t('mode.play') : t('mode.edit')}
    onclick={() => (ui.mode = ui.editing ? 'play' : 'edit')}><Icon name={ui.editing ? 'check' : 'edit'} size={22} /></button
  >
  <button class="ib help" aria-label={t('tips.open')} title={t('tips.open')} onclick={() => ui.openSheet(SectionTips, {})}><Icon name="help" size={22} /></button>
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
  /* «?» — підказка до розділу: видна і на планшеті, біля «Гра / Правка» */
  .ib.help {
    display: flex;
  }
  .ib {
    position: relative;
    isolation: isolate;
    width: var(--tap);
    height: var(--tap);
    border-radius: 2px;
    clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px);
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #f0dcb6;
    background: var(--frame-gold);
    border: none;
  }
  .ib::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    z-index: -1;
    clip-path: polygon(7px 0, calc(100% - 7px) 0, 100% 7px, 100% calc(100% - 7px), calc(100% - 7px) 100%, 7px 100%, 0 calc(100% - 7px), 0 7px);
    background: radial-gradient(ellipse 120% 100% at 50% 0%, #46342a, #1d140f);
  }
  .ib:active {
    transform: scale(0.9);
  }
  /* сургучная печать */
  .ib.qn::before {
    display: none;
  }
  .ib.qn {
    clip-path: none;
    border-radius: 47% 53% 50% 50% / 52% 46% 54% 48%;
    background:
      radial-gradient(circle at 50% 50%, transparent 52%, rgba(90, 24, 6, 0.35) 56%, transparent 60%),
      radial-gradient(circle at 36% 28%, #ffb27c, var(--ember) 42%, #b4481c 72%, #7a2a10);
    color: #4a1606;
    border: none;
    margin-bottom: 4px;
    box-shadow:
      inset 0 2px 2px rgba(255, 228, 200, 0.6),
      inset 0 -4px 6px rgba(90, 24, 6, 0.55),
      0 4px 0 #6a240c,
      0 5px 0 #4a1806,
      0 9px 14px rgba(0, 0, 0, 0.5),
      0 0 14px var(--ember-glow);
    transition:
      transform 0.12s var(--ease),
      box-shadow 0.12s var(--ease);
  }
  .ib.qn :global(svg) {
    filter: drop-shadow(0 1px 0 rgba(255, 210, 170, 0.55)) drop-shadow(0 -1px 0 rgba(70, 16, 2, 0.5));
  }
  .ib.qn:active {
    transform: translateY(4px) rotate(-4deg);
    box-shadow:
      inset 0 2px 2px rgba(255, 228, 200, 0.5),
      inset 0 -3px 5px rgba(90, 24, 6, 0.55),
      0 1px 0 #6a240c,
      0 3px 8px rgba(0, 0, 0, 0.45);
  }
  .ib.pen.on {
    color: #ffe6b8;
  }
  .ib.pen.on::before {
    background:
      radial-gradient(ellipse 90% 70% at 50% 110%, rgba(232, 116, 59, 0.7), transparent 70%),
      radial-gradient(ellipse 120% 100% at 50% 0%, #4a372b, #24190f);
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
