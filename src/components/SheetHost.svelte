<script lang="ts">
  import { ui } from '../lib/stores/ui.svelte';
  import { cubicOut } from 'svelte/easing';
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
  <aside class="sheet" in:fly={{ x: 90, duration: 300, easing: cubicOut }} out:fly={{ x: 60, duration: 180 }}>
    <C {...shown.props} />
  </aside>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at 70% 50%, rgba(8, 5, 4, 0.45), rgba(8, 5, 4, 0.7));
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    z-index: 40;
  }
  .sheet {
    position: fixed;
    right: 12px;
    top: 12px;
    bottom: 12px;
    width: min(560px, calc(100vw - 24px));
    background: var(--grain), var(--blotch), linear-gradient(180deg, #f3e8d2, #ead9b9 60%, #e0cba5);
    background-size: 180px 180px, 520px 520px, 100% 100%;
    border-radius: 22px;
    box-shadow:
      inset 0 0 0 1px rgba(150, 112, 62, 0.5),
      inset 0 1px 0 rgba(255, 252, 240, 0.7),
      inset 0 0 50px rgba(122, 72, 24, 0.22),
      var(--shadow-pop);
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
    border: 1px solid rgba(110, 78, 40, 0.55);
    color: var(--ink);
    background: linear-gradient(180deg, rgba(255, 250, 235, 0.55), rgba(255, 250, 235, 0.15));
    box-shadow:
      inset 0 1px 0 rgba(255, 252, 240, 0.8),
      0 1px 2px rgba(80, 50, 20, 0.2);
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
    /* «ручка» нижнего листа */
    .sheet::before {
      content: '';
      position: absolute;
      top: 7px;
      left: 50%;
      width: 40px;
      height: 4px;
      margin-left: -20px;
      border-radius: 2px;
      background: rgba(107, 90, 72, 0.35);
      z-index: 1;
    }
    .sheet :global(.chip) {
      padding: 0 9px;
      gap: 4px;
    }
  }
</style>
