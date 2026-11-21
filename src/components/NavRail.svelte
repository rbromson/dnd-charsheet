<script lang="ts">
  import Icon from './Icon.svelte';
  import Portrait from './Portrait.svelte';
  import { ui, type TabKey } from '../lib/stores/ui.svelte';
  import { charStore } from '../lib/stores/characters.svelte';
  import { t } from '../lib/i18n';

  const tabs: { key: TabKey; icon: string; label: string; hidden?: () => boolean }[] = [
    { key: 'sheet', icon: 'sheet', label: 'nav.sheet' },
    { key: 'combat', icon: 'combat', label: 'nav.combat' },
    { key: 'spells', icon: 'spells', label: 'nav.spells', hidden: () => !charStore.current?.spellcasting.enabled && ui.mode !== 'edit' },
    { key: 'gear', icon: 'gear', label: 'nav.gear' },
    { key: 'profile', icon: 'profile', label: 'nav.profile' },
    { key: 'journal', icon: 'journal', label: 'nav.journal' },
  ];
</script>

<nav class="rail">
  <button class="who" aria-label={t('nav.characters')} onclick={() => (ui.switcherOpen = !ui.switcherOpen)}>
    <Portrait id={charStore.current?.portraitId ?? null} name={charStore.current?.name ?? ''} size={56} />
  </button>
  <div class="items">
    {#each tabs as tab (tab.key)}
      {#if !tab.hidden?.()}
        <button class="it" class:on={ui.tab === tab.key} onclick={() => ui.go(tab.key)} aria-current={ui.tab === tab.key ? 'page' : undefined}>
          <span class="pl"><Icon name={tab.icon} /></span>
          <span class="lb">{t(tab.label)}</span>
        </button>
      {/if}
    {/each}
  </div>
  <div class="sp"></div>
  <button class="it dice" class:on={ui.diceTrayOpen} onclick={() => (ui.diceTrayOpen = !ui.diceTrayOpen)}>
    <span class="pl"><Icon name="dice" /></span>
    <span class="lb">{t('nav.dice')}</span>
  </button>
  <button class="fab" aria-label={t('nav.quickNote')} onclick={() => (ui.quickNoteOpen = true)}>
    <Icon name="feather" size={26} stroke={2} />
  </button>
</nav>

<style>
  .rail {
    width: 96px;
    flex-shrink: 0;
    height: 100%;
    background: var(--rail);
    border-right: 1px solid #2a1f19;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px 0 16px;
    gap: 6px;
    overflow-y: auto;
    padding-left: env(safe-area-inset-left);
  }
  .who {
    margin-bottom: 8px;
    border-radius: 50%;
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .it {
    width: 84px;
    min-height: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: #a08b72;
    font-size: 11.5px;
    font-weight: 500;
  }
  .pl {
    padding: 4px 16px;
    border-radius: 14px;
    display: flex;
    transition: background 0.15s;
  }
  .it.on {
    color: var(--ember);
  }
  .it.on .pl {
    background: var(--ember-soft);
  }
  .lb {
    white-space: nowrap;
  }
  .sp {
    flex: 1;
    min-height: 8px;
  }
  .fab {
    width: 60px;
    height: 60px;
    flex-shrink: 0;
    border-radius: 18px;
    background: var(--ember);
    color: var(--ember-ink);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 22px var(--ember-glow);
    margin-top: 6px;
  }
  .fab:active {
    transform: scale(0.95);
  }

  /* ===== Телефон: нижняя панель + плавающие кнопки ===== */
  @media (max-width: 640px) {
    .rail {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      width: auto;
      height: calc(64px + env(safe-area-inset-bottom));
      flex-direction: row;
      align-items: stretch;
      padding: 0 2px env(safe-area-inset-bottom);
      gap: 0;
      border-right: none;
      border-top: 1px solid #2a1f19;
      overflow: visible;
      z-index: 20;
    }
    .who,
    .sp {
      display: none;
    }
    .items {
      display: contents;
    }
    .it {
      flex: 1;
      width: auto;
      min-width: 0;
      min-height: 60px;
      font-size: 10px;
      gap: 2px;
    }
    .lb {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pl {
      padding: 4px 12px;
    }
    .fab,
    .it.dice {
      display: none;
    }
  }
</style>
