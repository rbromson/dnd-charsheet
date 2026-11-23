<script lang="ts">
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n';
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
</script>

<div class="toasts" aria-live="polite">
  {#each ui.toasts as toast (toast.id)}
    <div class="toast" in:fly={{ y: -30, duration: 320, easing: backOut }} out:fly={{ y: -16, duration: 160 }}>
      <!-- тап по тексту — прибрати тост -->
      <button class="grow msg" onclick={() => ui.dismiss(toast.id)}>{toast.message}</button>
      {#if toast.undo}
        <button
          class="btn undo"
          onclick={() => {
            toast.undo?.();
            ui.dismiss(toast.id);
          }}>{toast.actionLabel ?? t('common.undo')}</button
        >
      {/if}
    </div>
  {/each}
</div>

<style>
  .toasts {
    position: fixed;
    left: 50%;
    /* зверху: внизу тости закривали «Лікування», кнопки нотатки і шторок */
    top: calc(10px + env(safe-area-inset-top));
    translate: -50% 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 70;
    width: min(520px, calc(100vw - 140px));
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
    background: #2e241d;
    border: 1px solid var(--line2);
    color: var(--text);
    border-radius: 14px;
    padding: 4px 6px 4px 16px;
    min-height: 56px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }
  .msg {
    text-align: left;
    color: inherit;
    font: inherit;
    padding: 8px 0;
  }
  .undo {
    color: var(--ember);
  }
  @media (max-width: 640px) {
    .toasts {
      width: calc(100vw - 24px);
    }
  }
</style>
