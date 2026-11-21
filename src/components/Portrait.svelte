<script lang="ts">
  import MediaImage from './MediaImage.svelte';
  let { id, name, size = 64, glow = true }: { id: string | null; name: string; size?: number; glow?: boolean } = $props();
  const initial = $derived((name.trim()[0] ?? '?').toUpperCase());
</script>

<div class="por" class:glow style:width="{size}px" style:height="{size}px" style:font-size="{size * 0.42}px">
  {#if id}<MediaImage {id} alt={name} />{:else}<span class="sc">{initial}</span>{/if}
</div>

<style>
  .por {
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: radial-gradient(circle at 35% 30%, #8a6141, #3a2618);
    border: 2px solid var(--line2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--parch);
    font-weight: 700;
  }
  .por.glow {
    border-color: var(--ember);
    box-shadow: 0 0 14px var(--ember-glow);
  }
</style>
