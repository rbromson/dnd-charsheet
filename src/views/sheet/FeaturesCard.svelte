<script lang="ts">
  /** Уміння та особливості: карточки «название + текст». */
  import TextField from '../../components/TextField.svelte';
  import RowActions from '../../components/RowActions.svelte';
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { uid } from '../../lib/model/ids';
  import { move } from '../../lib/list';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  let expanded = $state<Record<string, boolean>>({});
  const isLong = (text: string) => text.length > 180 || text.split('\n').length > 3;

  function add() {
    c.features.push({ id: uid(), name: '', text: '' });
  }

  async function remove(id: string) {
    const f = c.features.find((x) => x.id === id);
    if (!f) return;
    const name = f.name || t('sheet.featureNew');
    const ok = await ui.confirm(t('common.deleteConfirm', { name }), { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    charStore.update(
      (ch) => {
        const i = ch.features.findIndex((x) => x.id === id);
        if (i >= 0) ch.features.splice(i, 1);
      },
      { undo: t('common.deleted', { name }) },
    );
  }
</script>

<section class="card">
  <h3 class="card-title">{t('sheet.features')}</h3>

  {#if ui.editing}
    <div class="edit-list">
      {#each c.features as f, i (f.id)}
        <div class="fe">
          <div class="row">
            <div class="grow"><TextField bind:value={f.name} placeholder={t('sheet.featureName')} serif /></div>
            <RowActions
              onUp={i > 0 ? () => move(c.features, i, -1) : undefined}
              onDown={i < c.features.length - 1 ? () => move(c.features, i, 1) : undefined}
              onDelete={() => remove(f.id)}
            />
          </div>
          <TextField bind:value={f.text} placeholder={t('sheet.featureText')} multiline rows={2} />
        </div>
      {/each}
      <button class="btn btn-outline add" onclick={add}><Icon name="plus" size={20} />{t('common.add')}</button>
    </div>
  {:else if c.features.length === 0}
    <div class="empty">{t('sheet.featuresEmpty')}</div>
  {:else}
    {#each c.features as f (f.id)}
      {@const long = isLong(f.text)}
      {@const open = !!expanded[f.id]}
      <button
        class="feat"
        class:clickable={long}
        aria-expanded={long ? open : undefined}
        onclick={() => long && (expanded[f.id] = !open)}
      >
        <span class="fn serif">{f.name || t('sheet.featureNew')}</span>
        {#if f.text}<span class="ft" class:clamp={long && !open}>{f.text}</span>{/if}
        {#if long}<span class="more">{open ? t('sheet.less') : t('sheet.more')}</span>{/if}
      </button>
    {/each}
  {/if}
</section>

<style>
  .feat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    width: 100%;
    text-align: left;
    padding: 8px 0;
    min-height: var(--tap);
    border-bottom: 1px solid color-mix(in srgb, var(--ink2) 20%, transparent);
    color: var(--ink);
    cursor: default;
  }
  .feat:last-child {
    border-bottom: none;
  }
  .feat.clickable {
    cursor: pointer;
  }
  .fn {
    font-weight: 700;
    font-size: 16.5px;
  }
  .ft {
    font-size: 13.5px;
    color: var(--ink2);
    line-height: 1.5;
    white-space: pre-line;
  }
  .clamp {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .more {
    font-size: 12.5px;
    font-weight: 600;
    color: var(--ink2);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .edit-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .fe {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-bottom: 12px;
    border-bottom: 1px solid color-mix(in srgb, var(--ink2) 20%, transparent);
  }
  .add {
    align-self: flex-start;
  }
</style>
