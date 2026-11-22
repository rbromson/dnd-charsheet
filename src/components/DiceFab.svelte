<script lang="ts">
  /** Плавающая кнопка лотка кубиков: самоцвет-d20 в золотой оправе (телефон и планшет). */
  import Icon from './Icon.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n';
</script>

{#if !ui.diceTrayOpen}
  <button class="fab" aria-label={t('nav.dice')} title={t('nav.dice')} onclick={() => (ui.diceTrayOpen = true)}>
    <span class="gem"><Icon name="dice" size={28} stroke={2} /></span>
  </button>
{/if}

<style>
  .fab {
    position: fixed;
    right: calc(20px + env(safe-area-inset-right));
    bottom: calc(20px + env(safe-area-inset-bottom));
    z-index: 30;
    width: 64px;
    height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    /* шестигранник — силуэт d20; рамка золотом */
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
    background: var(--frame-gold);
    filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 12px rgba(232, 116, 59, 0.35));
    animation: fab-in 0.32s var(--ease-spring) both;
    transition: transform 0.15s var(--ease-spring);
  }
  .gem {
    position: absolute;
    inset: 2.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
    background:
      linear-gradient(150deg, rgba(255, 230, 200, 0.35), transparent 40%),
      radial-gradient(circle at 50% 70%, #f39a5c 0%, #d2622c 45%, #7d2c10 100%);
    color: #fff1dc;
  }
  .gem :global(svg) {
    filter: drop-shadow(0 1px 1px rgba(60, 15, 0, 0.7));
  }
  .fab:active {
    transform: scale(0.9) rotate(-8deg);
  }
  @keyframes fab-in {
    from {
      opacity: 0;
      transform: scale(0.6) rotate(-30deg);
    }
  }
  @media (max-width: 640px) {
    .fab {
      right: calc(14px + env(safe-area-inset-right));
      bottom: calc(64px + 14px + env(safe-area-inset-bottom));
      width: 56px;
      height: 64px;
    }
  }
</style>
