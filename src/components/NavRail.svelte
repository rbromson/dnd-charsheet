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
    position: relative;
    background:
      var(--grain),
      linear-gradient(180deg, #1a130f 0%, var(--rail) 40%, #0d0907 100%);
    background-size: 180px 180px, 100% 100%;
    border-right: 1px solid #2a1f19;
    box-shadow:
      inset -1px 0 0 rgba(255, 210, 160, 0.04),
      8px 0 24px -12px rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px 0 16px;
    gap: 6px;
    overflow-y: auto;
    padding-left: env(safe-area-inset-left);
    z-index: 2;
  }
  .who {
    display: flex;
    margin-bottom: 8px;
    border-radius: 50%;
    padding: 3px;
    background: conic-gradient(from 200deg, #6b4a2c, #e6b450, #8a5a30, #e8743b, #6b4a2c);
    box-shadow: 0 0 18px rgba(232, 116, 59, 0.25);
    transition: transform 0.15s var(--ease);
  }
  .who:active {
    transform: scale(0.94);
  }
  .items {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .it {
    position: relative;
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
    transition: color 0.2s;
  }
  .pl {
    padding: 5px 18px;
    border-radius: 16px;
    display: flex;
    transition:
      background 0.25s var(--ease),
      box-shadow 0.25s var(--ease),
      transform 0.2s var(--ease-spring);
  }
  .it:active .pl {
    transform: scale(0.9);
  }
  .it.on {
    color: var(--ember);
  }
  .it.on .pl {
    background: linear-gradient(180deg, rgba(232, 116, 59, 0.28), rgba(232, 116, 59, 0.12));
    box-shadow:
      inset 0 0 0 1px rgba(232, 116, 59, 0.35),
      0 0 18px rgba(232, 116, 59, 0.22);
  }
  /* метка активного раздела у края панели */
  .it.on::before {
    content: '';
    position: absolute;
    left: -6px;
    top: 14px;
    width: 4px;
    height: 26px;
    border-radius: 0 3px 3px 0;
    background: var(--ember);
    box-shadow: 0 0 10px var(--ember-glow);
  }
  .lb {
    white-space: nowrap;
  }
  .it.on .lb {
    font-weight: 700;
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
    background: linear-gradient(160deg, #f39a62, var(--ember) 50%, #c9562a);
    color: var(--ember-ink);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      inset 0 1px 0 rgba(255, 225, 200, 0.6),
      inset 0 -3px 0 rgba(120, 40, 10, 0.25),
      0 0 0 4px rgba(232, 116, 59, 0.12),
      0 8px 26px var(--ember-glow);
    margin-top: 6px;
    transition: transform 0.15s var(--ease-spring);
  }
  .fab:active {
    transform: scale(0.92) rotate(-6deg);
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
      background:
        linear-gradient(180deg, rgba(26, 19, 15, 0.9), rgba(13, 9, 7, 0.97));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 -10px 30px -10px rgba(0, 0, 0, 0.8);
      overflow: visible;
      z-index: 20;
    }
    .it.on::before {
      left: 50%;
      top: -1px;
      width: 28px;
      height: 3px;
      margin-left: -14px;
      border-radius: 0 0 3px 3px;
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
