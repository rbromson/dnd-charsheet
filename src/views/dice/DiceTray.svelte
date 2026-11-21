<script lang="ts">
  /** Заглушка: лоток кубиков (Task 11). Открывается кнопкой «Кубики» в навигации. */
  import { ui } from '../../lib/stores/ui.svelte';
</script>

{#if ui.diceTrayOpen}
  <div class="tray panel">dice tray</div>
{/if}

<style>
  .tray { position: fixed; right: 12px; bottom: 12px; width: 360px; height: 400px; z-index: 35; }
</style>
