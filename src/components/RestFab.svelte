<script lang="ts">
  /** Малая плавающая кнопка «Привал» над кубиками: бронзовый медальон с вогнищем. */
  import Icon from './Icon.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n';
</script>

{#if !ui.restOpen && !ui.diceTrayOpen}
  <button class="rfab" class:away={ui.fabHidden} tabindex={ui.fabHidden ? -1 : 0} aria-label={t('rest.title')} title={t('rest.title')} onclick={() => (ui.restOpen = true)}>
    <Icon name="coffee" size={28} stroke={2} />
  </button>
{/if}

<style>
  /* ховається, поки листають вниз (окреме translate — не заважає анімації появи) */
  .rfab {
    transition:
      translate 0.28s var(--ease),
      opacity 0.2s;
  }
  .rfab.away {
    translate: 0 calc(100% + 140px);
    opacity: 0;
    pointer-events: none;
  }
  .rfab {
    position: fixed;
    /* над самоцветом кубиков, по его оси */
    right: calc(26px + env(safe-area-inset-right));
    bottom: calc(112px + env(safe-area-inset-bottom));
    z-index: 30;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffd29a;
    /* медальон: бронзовый борт, тёмное дно с угольком */
    background:
      radial-gradient(circle at 50% 78%, rgba(255, 140, 60, 0.55), transparent 55%),
      radial-gradient(circle at 50% 50%, #3a2416 0 62%, transparent 64%),
      linear-gradient(160deg, #f0cd85 0%, #b07c38 35%, #6e4a1c 70%, #9b7440 100%);
    box-shadow:
      inset 0 2px 1px rgba(255, 236, 190, 0.6),
      inset 0 -3px 4px rgba(40, 22, 8, 0.6),
      0 4px 0 #4e3312,
      0 5px 0 #33210b,
      0 9px 14px rgba(0, 0, 0, 0.5),
      0 0 12px rgba(232, 116, 59, 0.25);
    animation: rfab-in 0.32s var(--ease-spring) both;
    transition:
      transform 0.12s var(--ease),
      box-shadow 0.12s var(--ease);
    -webkit-tap-highlight-color: transparent;
  }
  .rfab :global(svg) {
    filter: drop-shadow(0 0 4px rgba(255, 150, 70, 0.75));
  }
  .rfab:active {
    transform: translateY(4px);
    box-shadow:
      inset 0 2px 1px rgba(255, 236, 190, 0.5),
      inset 0 -3px 4px rgba(40, 22, 8, 0.6),
      0 1px 0 #4e3312,
      0 3px 8px rgba(0, 0, 0, 0.45);
  }
  @keyframes rfab-in {
    from {
      opacity: 0;
      transform: scale(0.6);
    }
  }
  @media (max-width: 640px) {
    .rfab {
      right: calc(18px + env(safe-area-inset-right));
      bottom: calc(64px + 14px + 5px + 64px + 12px + env(safe-area-inset-bottom));
      width: 48px;
      height: 48px;
    }
  }
</style>
