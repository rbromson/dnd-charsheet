<script lang="ts">
  /**
   * Сетка картинок с добавлением из галереи/камеры, просмотром и удалением.
   * <Gallery bind:ids={c.gallery} characterId={c.id} onSetPortrait={(id) => (c.portraitId = id)} portraitId={c.portraitId} />
   */
  import Icon from './Icon.svelte';
  import MediaImage from './MediaImage.svelte';
  import { putMedia, resizeImage, pickFiles, deleteMedia } from '../lib/stores/media';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n';
  import { fade } from 'svelte/transition';

  let {
    ids = $bindable(),
    characterId,
    portraitId = null,
    onSetPortrait,
    size = 120,
    setLabel = '',
  }: {
    ids: string[];
    characterId: string;
    portraitId?: string | null;
    onSetPortrait?: (id: string) => void;
    size?: number;
    /** подпись кнопки «Зробити портретом» (для довідника — «аватаркою») */
    setLabel?: string;
  } = $props();

  let viewing = $state<string | null>(null);
  let busy = $state(false);

  async function add() {
    const files = await pickFiles('image/*', true);
    if (!files.length) return;
    busy = true;
    try {
      for (const f of files) {
        const blob = await resizeImage(f);
        const id = await putMedia(characterId, blob, 'image');
        ids = [...ids, id];
      }
    } finally {
      busy = false;
    }
  }

  async function remove(id: string) {
    const ok = await ui.confirm(t('gallery.deleteConfirm'), { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    ids = ids.filter((x) => x !== id);
    viewing = null;
    await deleteMedia(id);
  }
</script>

<div class="grid" style:--size="{size}px">
  {#each ids as id (id)}
    <button class="thumb" onclick={() => (viewing = id)}>
      <MediaImage {id} />
      {#if id === portraitId}<span class="badge"><Icon name="profile" size={14} /></span>{/if}
    </button>
  {/each}
  <button class="thumb add" disabled={busy} onclick={add} aria-label={t('gallery.add')}>
    <Icon name="image" size={26} />
    <span>{busy ? '…' : t('gallery.add')}</span>
  </button>
</div>

{#if viewing}
  <div class="lb" role="dialog" aria-modal="true" transition:fade={{ duration: 120 }}>
    <button class="bg" aria-label={t('common.close')} onclick={() => (viewing = null)}></button>
    <div class="img"><MediaImage id={viewing} fit="contain" /></div>
    <div class="bar">
      {#if onSetPortrait}
        <button
          class="btn btn-outline"
          onclick={() => {
            onSetPortrait?.(viewing!);
            ui.toast(t('gallery.portraitSet'));
          }}><Icon name="profile" size={20} />{setLabel || t('gallery.setPortrait')}</button
        >
      {/if}
      <button class="btn btn-danger" onclick={() => remove(viewing!)}><Icon name="trash" size={20} />{t('common.delete')}</button>
      <button class="btn btn-ink" onclick={() => (viewing = null)}>{t('common.close')}</button>
    </div>
  </div>
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(var(--size), 1fr));
    gap: 8px;
  }
  .thumb {
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
    background: rgba(42, 31, 23, 0.12);
    position: relative;
  }
  .add {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1.5px dashed currentColor;
    opacity: 0.7;
    font-size: 13px;
    font-weight: 600;
  }
  .badge {
    position: absolute;
    top: 6px;
    right: 6px;
    background: var(--ember);
    color: var(--ember-ink);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .lb {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    gap: 14px;
  }
  .bg {
    position: absolute;
    inset: 0;
    background: rgba(8, 5, 4, 0.92);
  }
  .img {
    position: relative;
    flex: 1;
    width: 100%;
    min-height: 0;
  }
  .bar {
    position: relative;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }
</style>
