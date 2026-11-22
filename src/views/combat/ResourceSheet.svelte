<script lang="ts">
  /** Настройки ресурса. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import TextField from '../../components/TextField.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import Icon from '../../components/Icon.svelte';
  import type { Recharge } from '../../lib/model/types';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  let { id }: { id: string } = $props();

  const c = $derived(charStore.current!);
  const r = $derived(c?.resources.find((x) => x.id === id));

  const dieOptions: { value: string | null; label: string }[] = [
    { value: null, label: t('combat.resNoDie') },
    ...['d4', 'd6', 'd8', 'd10', 'd12'].map((d) => ({ value: d, label: d })),
  ];
  const rechargeOptions: { value: Recharge; label: string }[] = [
    { value: 'short', label: t('combat.recharge.short') },
    { value: 'long', label: t('combat.recharge.long') },
    { value: 'manual', label: t('combat.recharge.manual') },
  ];

  async function remove() {
    if (!r) return;
    const name = r.name || t('combat.resNew');
    const ok = await ui.confirm(t('common.deleteConfirm', { name }), { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    ui.closeSheet();
    charStore.update(
      (ch) => {
        const i = ch.resources.findIndex((x) => x.id === id);
        if (i >= 0) ch.resources.splice(i, 1);
      },
      { undo: t('common.deleted', { name }) },
    );
  }
</script>

{#if r}
  <SheetFrame kicker={t('combat.resKicker')} title={r.name || t('combat.resNew')} value={`${r.current}/${r.max}`}>
    <TextField label={t('combat.resName')} bind:value={r.name} />
    <div class="two">
      <NumberField
        label={t('combat.resMax')}
        bind:value={r.max}
        min={0}
        max={99}
        big
        onchange={(v) => {
          if (v != null && r.current > v) r.current = v;
        }}
      />
      <NumberField label={t('combat.resCurrent')} bind:value={r.current} min={0} max={r.max} big />
    </div>
    <div>
      <span class="label">{t('combat.resDie')}</span>
      <Segmented bind:value={r.die} options={dieOptions} />
    </div>
    <div>
      <span class="label">{t('combat.resRecharge')}</span>
      <div class="wrap-seg"><Segmented bind:value={r.recharge} options={rechargeOptions} /></div>
    </div>
    <NumberField label={t('combat.resMaxPerRoll')} bind:value={r.maxPerRoll} nullable min={1} max={99} placeholder={t('combat.resNoLimit')} />

    {#snippet footer()}
      <button class="btn btn-danger" onclick={remove}><Icon name="trash" size={20} />{t('common.delete')}</button>
      <div class="grow"></div>
      <button class="btn btn-ink" onclick={() => ui.closeSheet()}><Icon name="check" size={20} />{t('common.done')}</button>
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .wrap-seg :global(.seg button) {
    white-space: normal;
    line-height: 1.15;
    font-size: 13px;
  }
</style>
