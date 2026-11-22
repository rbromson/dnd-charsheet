<script lang="ts">
  /** Аватар записи довідника: картинка (если выбрана) или буква на цвете типа (NPC — вино, місце — бірюза, завдання — охра). */
  import MediaImage from '../../components/MediaImage.svelte';
  import type { CodexEntry } from '../../lib/model/types';
  import { codexInitial } from './format';

  let { entry, size = 44, radius = 12 }: { entry: Pick<CodexEntry, 'kind' | 'name'> & { portraitId?: string | null }; size?: number; radius?: number } = $props();
</script>

<span class="av {entry.kind}" class:pic={!!entry.portraitId} style:width="{size}px" style:height="{size}px" style:border-radius="{radius}px" style:font-size="{size * 0.45}px">
  {#if entry.portraitId}<MediaImage id={entry.portraitId} alt={entry.name} />{:else}{codexInitial(entry as CodexEntry)}{/if}
</span>

<style>
  .av {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-family: var(--font-sc);
    font-weight: 700;
    color: var(--parch3);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  }
  .av.pic {
    box-shadow:
      0 0 0 2px var(--edge),
      0 2px 6px rgba(0, 0, 0, 0.3);
  }
  .av :global(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .npc {
    background: var(--t-wine);
  }
  .place {
    background: var(--t-teal);
  }
  .quest {
    background: var(--t-ochre);
  }
</style>
