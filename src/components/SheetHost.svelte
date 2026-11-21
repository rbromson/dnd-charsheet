<script lang="ts">
  import { ui } from '../lib/stores/ui.svelte';
  import { fly, fade } from 'svelte/transition';

  // Последнее открытое значение: пока карточка анимированно закрывается, ui.sheet уже null.
  let shown = $state(ui.sheet);
  let openedAt = 0;
  $effect(() => {
    if (ui.sheet) {
      if (ui.sheet !== shown) openedAt = performance.now();
      shown = ui.sheet;
    }
  });
  /** Защита от «призрачного» клика сразу после открытия. */
  function scrimClick() {
    if (performance.now() - openedAt < 400) return;
    ui.closeSheet();
  }
</script>

{#if ui.sheet && shown}
  {@const C = shown.component}
  <div class="scrim" role="presentation" transition:fade={{ duration: 150 }} onclick={scrimClick}></div>
  <aside class="sheet" transition:fly={{ x: 80, duration: 200 }}>
    <C {...shown.props} />
  </aside>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(8, 5, 4, 0.5);
    z-index: 40;
  }
  .sheet {
    position: fixed;
    right: 12px;
    top: 12px;
    bottom: 12px;
    width: min(560px, calc(100vw - 24px));
    background: linear-gradient(180deg, #f1e6cf, #e6d6b6);
    border-radius: 22px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    z-index: 41;
    overflow: hidden;
    /* карточки внутри используют стили .card */
  }
  .sheet :global(.field) {
    background: var(--parch3);
    border-color: var(--edge);
    color: var(--ink);
  }
  .sheet :global(.label) {
    color: var(--ink2);
  }
  .sheet :global(.chip) {
    background: transparent;
    color: var(--ink);
    border-color: var(--edge);
  }
  .sheet :global(.chip.on) {
    background: var(--ink);
    color: var(--parch);
    border-color: var(--ink);
  }
  .sheet :global(.btn-outline) {
    border-color: var(--ink);
    color: var(--ink);
  }
  .sheet :global(.seg) {
    background: rgba(42, 31, 23, 0.08);
  }
  .sheet :global(.seg button.on) {
    background: var(--ink);
    color: var(--parch);
  }
  .sheet :global(.muted) {
    color: var(--ink2);
  }
  @media (max-width: 640px) {
    .sheet {
      left: 0;
      right: 0;
      bottom: 0;
      top: 6dvh;
      width: auto;
      border-radius: 22px 22px 0 0;
      padding-bottom: env(safe-area-inset-bottom);
    }
    .sheet :global(.chip) {
      padding: 0 9px;
      gap: 4px;
    }
  }
</style>
