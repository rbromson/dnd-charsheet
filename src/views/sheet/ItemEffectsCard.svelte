<script lang="ts">
  /** «Від предметів»: що зараз дають надіті/налаштовані предмети — чуття, швидкості, бонуси й умовні ефекти. */
  import { charStore } from '../../lib/stores/characters.svelte';
  import { itemActive } from '../../lib/rules/calc';
  import { modText } from '../gear/modText';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  const rows = $derived(
    c.equipment
      .filter((i) => itemActive(i) && i.mods.length)
      .map((i) => ({ name: i.name, lines: i.mods.map((m) => ({ text: modText(m), hint: !!m.when })) })),
  );
</script>

{#if rows.length}
  <section class="card">
    <h3 class="card-title">{t('mod.title')}</h3>
    {#each rows as r (r.name)}
      <div class="it">
        <div class="nm serif">{r.name}</div>
        {#each r.lines as l, i (i)}<div class="ln" class:hint={l.hint}>{l.text}</div>{/each}
      </div>
    {/each}
  </section>
{/if}

<style>
  .it {
    padding: 6px 0;
    border-bottom: 1px dashed color-mix(in srgb, var(--ink2) 25%, transparent);
  }
  .it:last-child {
    border-bottom: none;
  }
  .nm {
    font-weight: 700;
    font-size: 14.5px;
  }
  .ln {
    font-size: 13.5px;
    line-height: 1.45;
  }
  .ln.hint {
    color: var(--ink2);
    font-style: italic;
  }
</style>
