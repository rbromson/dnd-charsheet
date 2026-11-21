<script lang="ts">
  import Icon from './Icon.svelte';
  import Segmented from './Segmented.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n';
  import type { Snippet } from 'svelte';

  let { title, children }: { title: string; children?: Snippet } = $props();
</script>

<header class="top" class:editing={ui.editing}>
  <h1 class="sc">{title}</h1>
  {#if ui.editing}<span class="hint"><Icon name="edit" size={16} />{t('mode.editHint')}</span>{/if}
  <div class="grow"></div>
  {#if children}<div class="extra">{@render children()}</div>{/if}
  <div class="mode">
    <Segmented
      bind:value={ui.mode}
      options={[
        { value: 'play', label: t('mode.play') },
        { value: 'edit', label: t('mode.edit') },
      ]}
    />
  </div>
</header>

<style>
  .top {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 20px;
    min-height: 68px;
    background: rgba(23, 17, 14, 0.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid transparent;
  }
  .top.editing {
    border-bottom-color: var(--ember);
  }
  h1 {
    font-size: 22px;
    color: var(--parch);
  }
  .hint {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--ember);
  }
  .mode {
    width: 210px;
  }
  .extra {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  @media (max-width: 1000px) {
    .top {
      flex-wrap: wrap;
      row-gap: 8px;
    }
    .hint {
      display: none;
    }
    .extra {
      order: 3;
      width: 100%;
      justify-content: flex-start;
    }
  }
</style>
