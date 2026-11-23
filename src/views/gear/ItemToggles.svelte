<script lang="ts">
  /** Переключатели предмета: «Запалити», «Клацнути підборами»… Пока включено — эффекты действуют. */
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { buzz } from '../../lib/stores/ui.svelte';
  import { toggleReady } from '../../lib/rules/calc';
  import { modText } from './modText';
  import { dieText, t } from '../../lib/i18n';

  let { itemId }: { itemId: string } = $props();
  const item = $derived(charStore.current?.equipment.find((x) => x.id === itemId));
</script>

{#if item && item.toggles.length}
  <div class="tgs">
    {#each item.toggles as tg (tg.id)}
      <button
        class="key-tile tg"
        class:on={tg.on}
        aria-pressed={tg.on}
        disabled={!toggleReady(item)}
        onclick={() => {
          tg.on = !tg.on;
          buzz(tg.on ? [10, 30, 10] : 8);
        }}
      >
        <Icon name={tg.on ? 'sparkle' : 'bolt'} size={16} />
        <span>{tg.name}</span>
      </button>
      <div class="meta">
        {[...tg.extra.map((x) => `+${dieText(x.dice)} ${x.type}`), ...tg.mods.map(modText), tg.note].filter(Boolean).join(' · ')}
        {#if !toggleReady(item)} · {t('pw.needAttune')}{/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .tgs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 8px;
  }
  .tg {
    align-self: flex-start;
    gap: 6px;
    min-height: 40px;
    padding: 0 14px;
    font-family: var(--font-sc);
    font-size: 14px;
  }
  .meta {
    font-size: 12.5px;
    color: var(--ink2);
  }
</style>
