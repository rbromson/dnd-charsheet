<script lang="ts">
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n';
  import { fade, scale } from 'svelte/transition';
</script>

{#if ui.confirmState}
  {@const s = ui.confirmState}
  <div class="scrim" transition:fade={{ duration: 120 }} role="presentation" onclick={() => s.resolve(false)}></div>
  <div class="dlg card" role="alertdialog" aria-modal="true" transition:scale={{ start: 0.95, duration: 150 }}>
    <p class="msg">{s.message}</p>
    {#if s.details?.length}
      <ul>
        {#each s.details as d (d)}<li>{d}</li>{/each}
      </ul>
    {/if}
    <div class="row actions">
      <button class="btn btn-outline grow" onclick={() => s.resolve(false)}>{s.cancelLabel ?? t('common.cancel')}</button>
      <button class="btn grow {s.danger ? 'btn-danger' : 'btn-ink'}" onclick={() => s.resolve(true)}>{s.okLabel ?? t('common.confirm')}</button>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(8, 5, 4, 0.6);
    z-index: 60;
  }
  .dlg {
    position: fixed;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    width: min(440px, calc(100vw - 32px));
    z-index: 61;
    padding: 20px;
  }
  .msg {
    margin: 0 0 12px;
    font-size: 16px;
    line-height: 1.5;
  }
  ul {
    margin: 0 0 12px;
    padding-left: 20px;
    font-size: 14px;
    color: var(--ink2);
  }
  .actions {
    margin-top: 8px;
  }
</style>
