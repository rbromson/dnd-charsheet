<script lang="ts">
  /** Кидки рятунку: тап — бросок, долгий тап / правка — настройки. */
  import ProfDot from './ProfDot.svelte';
  import SaveSheet from './SaveSheet.svelte';
  import { ABILITIES, type Ability } from '../../lib/model/types';
  import { press } from '../../lib/actions/press';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { fmt, saveBonus } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  const open = (a: Ability) => ui.openSheet(SaveSheet, { ability: a });
  function roll(a: Ability) {
    dice.askCheck({ kind: 'save', label: t('sheet.saveLabel', { ability: t(`ability.${a}`) }), bonus: saveBonus(c, a) });
  }
</script>

<section class="card">
  <h3 class="card-title">{t('sheet.saves')}</h3>
  <div class="list">
    {#each ABILITIES as a (a)}
      <button class="sk" class:editing={ui.editing} use:press={{ onTap: () => (ui.editing ? open(a) : roll(a)), onLong: () => open(a) }}>
        <ProfDot prof={c.saves[a].prof} />
        <span class="b num" class:manual={c.saves[a].override != null}>{fmt(saveBonus(c, a))}</span>
        <span class="n">{t(`ability.${a}`)}</span>
      </button>
    {/each}
  </div>
</section>

<style>
  .list {
    columns: 2;
    column-gap: 18px;
  }
  .sk {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: var(--tap);
    break-inside: avoid;
    border-bottom: 1px dashed color-mix(in srgb, var(--ink2) 25%, transparent);
    font-size: 14.5px;
    text-align: left;
    user-select: none;
    color: var(--ink);
  }
  .sk:active {
    background: color-mix(in srgb, var(--ember) 12%, transparent);
  }
  .b {
    width: 32px;
    text-align: right;
    font-size: 16px;
  }
  .manual {
    text-decoration: underline dotted;
    text-underline-offset: 3px;
  }
  .n {
    flex: 1;
    min-width: 0;
  }
  .editing .n {
    text-decoration: underline dashed color-mix(in srgb, var(--ink2) 50%, transparent);
    text-underline-offset: 4px;
  }
</style>
