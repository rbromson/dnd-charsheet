<script lang="ts">
  /** «Предмети в ділі»: зілля, жезли, намисто — дії під рукою в бою. Лише предмети, що мають дії. */
  import ItemPowers from '../gear/ItemPowers.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  const items = $derived((charStore.current?.equipment ?? []).filter((i) => i.powers.length && i.id !== ui.draft));
</script>

{#if items.length}
  <section class="card">
    <h3 class="card-title">{t('pw.combatTitle')}</h3>
    {#each items as it (it.id)}
      <div class="it">
        <div class="nm serif">{it.name || t('gear.unnamed')}{#if it.qty > 1}<span class="q num"> ×{it.qty}</span>{/if}</div>
        <ItemPowers itemId={it.id} compact />
      </div>
    {/each}
  </section>
{/if}

<style>
  .it {
    padding: 8px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--ink2) 20%, transparent);
  }
  .it:last-child {
    border-bottom: none;
  }
  .nm {
    font-weight: 700;
    font-size: 15px;
  }
  .q {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--ink2);
  }
</style>
