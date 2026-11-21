<script lang="ts">
  import TopBar from '../../components/TopBar.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import Icon from '../../components/Icon.svelte';
  import SpellHeader from './SpellHeader.svelte';
  import SpellLevel from './SpellLevel.svelte';
  import SpellSheet from './SpellSheet.svelte';
  import SpellLibrary from './SpellLibrary.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { uid } from '../../lib/model/ids';
  import { splitBalanced } from './layout';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  /** Раскладка как в PDF: 0–2, 3–5, 6–9 */
  const PDF_COLUMNS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8, 9],
  ];

  const count = (l: number) => c.spells.reduce((n, s) => n + (s.level === l ? 1 : 0), 0);
  const hasSlots = (l: number) => l > 0 && c.spellcasting.slots[l].total > 0;

  const visible = $derived(LEVELS.filter((l) => count(l) > 0 || hasSlots(l)));

  const columns = $derived.by(() => {
    if (ui.editing) return PDF_COLUMNS;
    const weights = visible.map((l) => 2 + count(l) + (hasSlots(l) ? 1 : 0));
    return splitBalanced(weights, 3).map((g) => g.map((i) => visible[i]));
  });

  function addSpell() {
    const id = uid();
    c.spells.push({ id, level: 0, name: '', prepared: false, text: '' });
    ui.openSheet(SpellSheet, { id });
  }
</script>

<TopBar title={t('nav.spells')}>
  <button class="btn btn-outline" onclick={() => ui.openSheet(SpellLibrary, {})}><Icon name="search" size={18} />{t('lib.open')}</button>
  {#if ui.editing && c.spellcasting.enabled}
    <button class="btn btn-outline" onclick={addSpell}><Icon name="plus" size={20} />{t('spells.add')}</button>
  {/if}
</TopBar>
<div class="view">
  {#if !c.spellcasting.enabled}
    <section class="card off">
      <div class="ico"><Icon name="spells" size={40} stroke={1.5} /></div>
      <h2 class="serif">{t('spells.offTitle')}</h2>
      <p>{t('spells.offText')}</p>
      <Toggle bind:checked={c.spellcasting.enabled} label={t('spells.enabled')} />
    </section>
  {:else}
    <SpellHeader />
    {#if !ui.editing && visible.length === 0}
      <div class="card empty">{t('spells.emptyAll')}</div>
    {:else}
      <div class="cols cols-3">
        {#each columns as col, ci (ci)}
          <div class="stack">
            {#each col as l (l)}
              <SpellLevel level={l} />
            {/each}
          </div>
        {/each}
      </div>
      {#if !ui.editing}
        <p class="hint muted">{t('spells.hint')}</p>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .off {
    max-width: 560px;
    margin: 24px auto 0;
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ico {
    color: var(--ember);
  }
  .off h2 {
    font-size: 26px;
  }
  .off p {
    margin: 0 0 6px;
    line-height: 1.55;
    color: var(--ink2);
  }
  .hint {
    font-size: 13px;
    margin: 0;
    text-align: center;
  }
</style>
