<script lang="ts">
  /** Карточка заклинания: название, уровень, подготовлено, описание, удаление. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import TextField from '../../components/TextField.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import Icon from '../../components/Icon.svelte';
  import { onDestroy, untrack } from 'svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  /** fresh — только что созданное: «Скасувати» / «Додати»; attackId — атака, созданная вместе с ним (уберём при отмене) */
  let { id, fresh = false, attackId = null }: { id: string; fresh?: boolean; attackId?: string | null } = $props();
  let confirmed = false;
  // черновик: в списке не показываем, пока не нажали «Додати»
  untrack(() => {
    if (!fresh) return;
    ui.draft = id;
    const sp = charStore.current?.spells.find((x) => x.id === id);
    if (sp) sp.draft = true;
  });

  onDestroy(() => {
    if (ui.draft === id) ui.draft = null;
    const ch = charStore.current;
    if (!fresh || confirmed || !ch) return;
    ch.spells = ch.spells.filter((x) => x.id !== id);
    if (attackId) ch.attacks = ch.attacks.filter((a) => a.id !== attackId);
  });

  function confirmAdd() {
    confirmed = true;
    if (s) delete s.draft;
    ui.toast(t('add.added', { name: s?.name.trim() || t('spells.unnamed') }));
    ui.closeSheet();
  }

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
      {#if fresh}
        <button class="btn btn-outline" onclick={() => ui.closeSheet()}>{t('common.cancel')}</button>
        <button class="btn btn-primary grow" onclick={confirmAdd}><Icon name="plus" size={20} />{t('add.confirm')}</button>
      {:else}
        <button class="btn btn-danger" onclick={remove}><Icon name="trash" size={20} />{t('common.delete')}</button>
        <div class="grow"></div>
        <button class="btn btn-ink" onclick={() => ui.closeSheet()}><Icon name="check" size={20} />{t('common.done')}</button>
      {/if}
    {/snippet}
  </SheetFrame>
{/if}
