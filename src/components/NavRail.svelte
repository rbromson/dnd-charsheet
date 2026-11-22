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
      var(--pores),
      var(--crinkle),
      linear-gradient(180deg, #2c1f18 0%, #1f1611 45%, #150e0b 100%);
    background-size: 140px 140px, 300px 300px, 100% 100%;
    border-right: 1px solid #0a0605;
    box-shadow:
      inset -1px 0 0 rgba(222, 176, 96, 0.2),
      inset -7px 0 0 -6px var(--stitch),
      8px 0 24px -12px rgba(0, 0, 0, 0.85);
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
    width: 86px;
    min-height: 64px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    color: #9a8468;
    font-family: var(--font-sc);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    transition: color 0.2s;
  }
  /* ячейка как слот панели умений: бронзовая рамка со срезанными углами, тёмное дно */
  .pl {
    --cut: 9px;
    position: relative;
    isolation: isolate;
    width: 56px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    clip-path: polygon(var(--cut) 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, var(--cut) 100%, 0 calc(100% - var(--cut)), 0 var(--cut));
    background: transparent;
    transition:
      opacity 0.2s,
      transform 0.2s var(--ease-spring);
  }
  .pl::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    z-index: -1;
    clip-path: polygon(calc(var(--cut) - 0.6px) 0, calc(100% - var(--cut) + 0.6px) 0, 100% calc(var(--cut) - 0.6px), 100% calc(100% - var(--cut) + 0.6px), calc(100% - var(--cut) + 0.6px) 100%, calc(var(--cut) - 0.6px) 100%, 0 calc(100% - var(--cut) + 0.6px), 0 calc(var(--cut) - 0.6px));
    background:
      radial-gradient(ellipse 90% 70% at 50% 0%, rgba(255, 220, 170, 0.07), transparent 70%),
      linear-gradient(180deg, #1b130e, #0e0907);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.8);
    opacity: 0;
    transition: opacity 0.25s var(--ease);
  }
  .it:hover {
    color: #c9b08c;
  }
  .it:active .pl {
    transform: scale(0.9);
  }
  .it.on {
    color: #e9c98c;
  }
  .it.on .pl {
    color: #f6dcaa;
    background: linear-gradient(180deg, rgba(214, 170, 96, 0.75), rgba(120, 84, 38, 0.6));
  }
  .it.on .pl::before {
    opacity: 1;
    background:
      radial-gradient(ellipse 80% 60% at 50% 100%, rgba(232, 116, 59, 0.32), transparent 70%),
      linear-gradient(180deg, #24170f, #140d09);
    box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.7);
  }
  /* золотой ромб-указатель у края панели */
  .it.on::before {
    content: '';
    position: absolute;
    left: -2px;
    top: 26px;
    width: 7px;
    height: 7px;
    transform: rotate(45deg);
    background: linear-gradient(135deg, #f3d696, #b98436);
    box-shadow: 0 0 6px rgba(240, 190, 100, 0.45);
  }
  .lb {
    white-space: nowrap;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.7);
  }
  .sp {
    flex: 1;
    min-height: 8px;
  }
  .fab {
    width: 60px;
    height: 60px;
    flex-shrink: 0;
    /* сургучная печать с пером */
    border-radius: 47% 53% 50% 50% / 52% 46% 54% 48%;
    background: radial-gradient(circle at 36% 30%, #f6a36c, var(--ember) 45%, #a8401a 80%, #7a2a10);
    color: #3a1206;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      inset 0 0 0 5px rgba(122, 42, 16, 0.25),
      inset 0 0 0 7px rgba(255, 200, 160, 0.18),
      inset 0 2px 2px rgba(255, 230, 200, 0.5),
      0 0 0 3px rgba(232, 116, 59, 0.12),
      0 8px 22px var(--ember-glow);
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
      border-top: none;
      background:
        linear-gradient(90deg, transparent, rgba(210, 165, 90, 0.35) 20%, rgba(230, 190, 120, 0.5) 50%, rgba(210, 165, 90, 0.35) 80%, transparent) top / 100% 1.5px no-repeat,
        var(--pores),
        linear-gradient(180deg, rgba(36, 26, 20, 0.94), rgba(13, 9, 7, 0.98));
      background-size: 100% 1.5px, 140px 140px, 100% 100%;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 -10px 30px -10px rgba(0, 0, 0, 0.8);
      overflow: visible;
      z-index: 20;
    }
    .it.on::before {
      left: 50%;
      margin-left: -3.5px;
      top: -4px;
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
      font-family: inherit;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0;
      gap: 3px;
    }
    .lb {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pl {
      --cut: 7px;
      width: 46px;
      height: 32px;
    }
    .fab,
    .it.dice {
      display: none;
    }
  }
</style>
