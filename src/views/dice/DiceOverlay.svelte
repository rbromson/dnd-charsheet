<script lang="ts">
  /** Заглушка: оверлей результата броска (Task 11). */
  import { dice } from '../../lib/stores/dice.svelte';
</script>

{#if dice.overlayOpen && dice.last}
  <button class="o" onclick={() => dice.close()}>{dice.last.label}: {dice.last.roll.total}</button>
{/if}

<style>
  .o { position: fixed; inset: auto 0 40% 0; margin: auto; width: 300px; height: 120px; background: #2a201a; color: #fff; z-index: 50; border-radius: 20px; font-size: 32px; }
</style>
