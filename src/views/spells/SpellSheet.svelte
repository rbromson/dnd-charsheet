<script lang="ts">
  /** Карточка заклинания: название, уровень, подготовлено, описание, удаление. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import TextField from '../../components/TextField.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  let { id }: { id: string } = $props();

  const c = $derived(charStore.current);
  const s = $derived(c?.spells.find((x) => x.id === id));

  const levels = Array.from({ length: 10 }, (_, i) => ({ value: i, label: String(i) }));

  async function remove() {
    if (!s) return;
    const name = s.name.trim() || t('spells.unnamed');
    const ok = await ui.confirm(t('spells.deleteConfirm', { name }), { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    ui.closeSheet();
    charStore.update(
      (ch) => {
        ch.spells = ch.spells.filter((x) => x.id !== id);
      },
      { undo: t('spells.deleted', { name }) },
    );
  }
</script>

{#if s}
  <SheetFrame
    kicker={s.level === 0 ? t('spells.kickerCantrip') : t('spells.kickerLevel', { n: s.level })}
    title={s.name.trim() || t('spells.unnamed')}
  >
    <TextField bind:value={s.name} label={t('spells.name')} serif />
    <div>
      <span class="label">{t('spells.levelPick')}</span>
      <Segmented bind:value={s.level} options={levels} />
    </div>
    {#if s.level > 0}
      <Toggle bind:checked={s.prepared} label={t('spells.prepared')} />
    {/if}
    <TextField bind:value={s.text} label={t('spells.text')} placeholder={t('spells.textPlaceholder')} multiline rows={8} serif />

    {#snippet footer()}
      <button class="btn btn-danger" onclick={remove}><Icon name="trash" size={20} />{t('common.delete')}</button>
      <div class="grow"></div>
      <button class="btn btn-ink" onclick={() => ui.closeSheet()}><Icon name="check" size={20} />{t('common.done')}</button>
    {/snippet}
  </SheetFrame>
{/if}
