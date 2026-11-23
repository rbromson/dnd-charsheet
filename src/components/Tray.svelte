<script lang="ts">
  /**
   * Каркас лотка: на горизонтальном планшете — панель справа снизу, на телефоне и в
   * вертикальной ориентации — лист снизу. Постоянная высота, чтобы содержимое не прыгало.
   * Общий для «Кубиків» и «Привалу».
   */
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { t } from '../lib/i18n';
  import { ui } from '../lib/stores/ui.svelte';

  let { title, onclose, children }: { title: string; onclose: () => void; children: Snippet } = $props();
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || ui.sheet || ui.confirmState) return;
    onclose();
    // с клавиатуры — вернуть фокус на плавающую кнопку
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-fab="dice"]')?.focus());
  }}
/>

<aside class="tray" aria-label={title}>
  <header>
    <h2 class="sc">{title}</h2>
    <button class="icon-btn" aria-label={t('dice.close')} onclick={onclose}>
      <Icon name="close" />
    </button>
  </header>
  <div class="body">
    {@render children()}
  </div>
</aside>

<style>
  .tray {
    position: fixed;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
    right: 12px;
    bottom: 12px;
    width: 396px;
    /* постоянная высота: выбор костей и результат броска не прыгают */
    height: min(540px, calc(100dvh - 24px));
    z-index: 35;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(circle at 50% 55%, rgba(232, 116, 59, 0.14), transparent 45%),
      var(--leather);
    background-size: 100% 100%, var(--leather-size);
    border: 1px solid #0a0605;
    border-radius: 20px;
    box-shadow:
      var(--leather-shadow),
      var(--shadow-pop);
    overflow: hidden;
    animation: tray-in 0.22s cubic-bezier(0.2, 0.9, 0.3, 1) both;
  }
  header {
    display: flex;
    align-items: center;
    padding: 6px 6px 0 18px;
  }
  h2 {
    flex: 1;
    font-size: 19px;
    letter-spacing: 0.03em;
    color: var(--parch);
    text-shadow: 0 0 20px rgba(232, 116, 59, 0.25);
  }
  .icon-btn {
    width: var(--tap);
    height: var(--tap);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    color: var(--muted);
  }
  .body {
    flex: 1;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 4px 14px 14px;
  }


  @media (max-width: 760px), (orientation: portrait) {
    .tray {
      left: 0;
      right: 0;
      bottom: 0;
      width: auto;
      height: min(580px, 78dvh);
      min-height: 0;
      border-radius: 22px 22px 0 0;
      border-bottom: none;
      padding-bottom: env(safe-area-inset-bottom);
      animation-name: sheet-in;
    }
    .body {
      width: 100%;
      max-width: 560px;
      margin: 0 auto;
    }
  }
  @keyframes tray-in {
    from {
      opacity: 0;
      transform: translate3d(24px, 0, 0);
    }
  }
  @keyframes sheet-in {
    from {
      transform: translate3d(0, 40px, 0);
      opacity: 0;
    }
  }
</style>
