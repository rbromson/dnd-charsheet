<script lang="ts">
  /** Картинка из IndexedDB по id. */
  import { getMediaUrl } from '../lib/stores/media';
  let { id, alt = '', fit = 'cover' }: { id: string | null; alt?: string; fit?: 'cover' | 'contain' } = $props();
  let url = $state<string | null>(null);
  $effect(() => {
    let alive = true;
    getMediaUrl(id).then((u) => {
      if (alive) url = u;
    });
    return () => {
      alive = false;
    };
  });
</script>

{#if url}<img src={url} {alt} style:object-fit={fit} draggable="false" />{/if}

<style>
  img {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
