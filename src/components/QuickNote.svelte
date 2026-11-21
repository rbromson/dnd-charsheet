<script lang="ts">
  /** Заглушка: быстрая заметка (Task 9). Открывается FAB в навигации. */
  import { ui } from '../lib/stores/ui.svelte';
</script>

{#if ui.quickNoteOpen}
  <button class="q panel" onclick={() => (ui.quickNoteOpen = false)}>quick note</button>
{/if}

<style>
  .q { position: fixed; left: 120px; bottom: 20px; width: 400px; height: 200px; z-index: 45; }
</style>
