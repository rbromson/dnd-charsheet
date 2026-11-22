<script lang="ts">
  /**
   * Плавающая кнопка лотка кубиков: огранённый самоцвет в золотой оправе (телефон и планшет).
   * Объём: грани с разной освещённостью (свет слева сверху), площадка-«стол» в центре
   * и тёмная боковина снизу; при нажатии камень вдавливается.
   */
  import Icon from './Icon.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n';
</script>

{#if !ui.diceTrayOpen && !ui.restOpen}
  <button class="fab" aria-label={t('nav.dice')} title={t('nav.dice')} onclick={() => (ui.diceTrayOpen = true)}>
    <span class="side" aria-hidden="true"></span>
    <span class="body" aria-hidden="true">
      <span class="rim"></span>
      <span class="gem"></span>
      <span class="table"><Icon name="dice" size={24} stroke={2.1} /></span>
      <span class="glint"></span>
    </span>
  </button>
{/if}

<style>
  .fab {
    --hex: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
    --depth: 6px;
    position: fixed;
    right: calc(20px + env(safe-area-inset-right));
    bottom: calc(20px + var(--depth) + env(safe-area-inset-bottom));
    z-index: 30;
    width: 64px;
    height: 72px;
    padding: 0;
    filter: drop-shadow(0 10px 10px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 14px rgba(232, 116, 59, 0.3));
    animation: fab-in 0.32s var(--ease-spring) both;
    -webkit-tap-highlight-color: transparent;
  }
  .side,
  .body,
  .rim,
  .gem,
  .table,
  .glint {
    position: absolute;
    clip-path: var(--hex);
  }
  /* боковина — толщина камня */
  .side {
    inset: 0;
    transform: translateY(var(--depth));
    background: linear-gradient(90deg, #4a2a10, #7a4c1c 30%, #5a3412 70%, #2e1a08);
  }
  .body {
    inset: 0;
    transition: transform 0.12s var(--ease);
  }
  .rim {
    inset: 0;
    background: linear-gradient(160deg, #fbe5ab 0%, #d9a650 30%, #8a5a22 70%, #5a3a14 100%);
  }
  /* шесть граней: свет слева сверху */
  .gem {
    inset: 3px;
    background: conic-gradient(
      from 0deg,
      #f7a066 0deg 60deg,
      #d86a32 60deg 120deg,
      #8a3212 120deg 180deg,
      #a8441a 180deg 240deg,
      #e88450 240deg 300deg,
      #ffc08a 300deg 360deg
    );
  }
  /* плоская площадка в центре */
  .table {
    inset: 24% 22%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff4e2;
    background: radial-gradient(circle at 40% 30%, #f9ae78, #df6c33 60%, #b24a1c);
    box-shadow: inset 0 0 0 1px rgba(255, 220, 180, 0.35);
  }
  .table :global(svg) {
    filter: drop-shadow(0 1px 0 rgba(90, 25, 0, 0.8));
  }
  .glint {
    inset: 3px;
    background: linear-gradient(150deg, rgba(255, 255, 255, 0.4) 0%, transparent 32%);
    pointer-events: none;
  }
  .fab:active .body {
    transform: translateY(calc(var(--depth) - 1px));
  }
  .fab:active .side {
    transform: translateY(var(--depth)) scaleY(0.98);
  }
  @keyframes fab-in {
    from {
      opacity: 0;
      transform: scale(0.6) rotate(-30deg);
    }
  }
  @media (max-width: 640px) {
    .fab {
      --depth: 5px;
      right: calc(14px + env(safe-area-inset-right));
      bottom: calc(64px + 14px + var(--depth) + env(safe-area-inset-bottom));
      width: 56px;
      height: 64px;
    }
  }
</style>
