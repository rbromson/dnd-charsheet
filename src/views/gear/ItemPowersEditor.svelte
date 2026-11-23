<script lang="ts">
  /**
   * Свой предмет: заряды (максимум, сколько повертається «на світанку») и действия
   * (назва, кубики, що робить, ціна в зарядах, чи витрачає штуку). Для предметов из библиотеки всё уже заполнено.
   */
  import Icon from '../../components/Icon.svelte';
  import TextField from '../../components/TextField.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { uid } from '../../lib/model/ids';
  import { t } from '../../lib/i18n';

  let { itemId }: { itemId: string } = $props();

  const c = $derived(charStore.current);
  const item = $derived(c?.equipment.find((x) => x.id === itemId));
  const res = $derived(item?.resourceId ? c?.resources.find((r) => r.id === item.resourceId) : undefined);

  const results = $derived([
    { value: 'heal', label: t('pwe.heal') },
    { value: 'temp', label: t('pwe.temp') },
    { value: 'damage', label: t('pwe.damage') },
    { value: 'info', label: t('pwe.info') },
  ]);

  function setCharges(on: boolean) {
    if (!c || !item) return;
    if (on) {
      const rid = uid();
      c.resources.push({ id: rid, name: item.name, max: 3, current: 3, die: null, recharge: 'long', maxPerRoll: null, regain: null, onEmpty: null });
      item.resourceId = rid;
    } else {
      const rid = item.resourceId;
      c.resources = c.resources.filter((r) => r.id !== rid);
      item.resourceId = null;
      for (const p of item.powers) p.cost = 0;
    }
  }

  function addPower() {
    if (!item) return;
    item.powers.push({
      id: uid(),
      name: t('pwe.newName'),
      cost: item.resourceId ? 1 : 0,
      costMax: null,
      consume: !item.resourceId,
      dice: '',
      extra: '',
      result: 'info',
      self: true,
      dc: null,
      save: null,
      note: '',
      spell: null,
      level: 0,
      upcast: false,
      dcUser: false,
      attack: null,
      effect: null,
    });
  }
</script>

{#if item}
  <section class="ed">
    <Toggle checked={!!res} label={t('pwe.charges')} onchange={setCharges} />
    {#if res}
      <div class="two">
        <NumberField
          label={t('combat.resMax')}
          bind:value={res.max}
          min={1}
          max={99}
          onchange={(v) => {
            if (v != null && res.current > v) res.current = v;
          }}
        />
        <TextField label={t('combat.resRegain')} bind:value={() => res.regain ?? '', (v) => (res.regain = v.trim() || null)} placeholder={t('combat.resRegainPh')} />
      </div>
    {/if}

    <span class="label">{t('pw.title')}</span>
    {#each item.powers as p, i (p.id)}
      <div class="pe">
        <div class="head">
          <div class="grow"><TextField label={t('common.name')} bind:value={p.name} /></div>
          <button class="btn btn-ghost x" aria-label={t('common.delete')} onclick={() => item.powers.splice(i, 1)}><Icon name="trash" size={18} /></button>
        </div>
        <div class="two">
          <TextField label={t('pwe.dice')} bind:value={p.dice} placeholder="2к4+2" />
          <div>
            <span class="label">{t('pwe.does')}</span>
            <Segmented bind:value={p.result} options={results} />
          </div>
        </div>
        <div class="row">
          {#if res}
            <span class="label grow">{t('pwe.cost')}</span>
            <Stepper bind:value={p.cost} min={0} max={20} />
          {/if}
        </div>
        <Toggle bind:checked={p.consume} label={t('pwe.consume')} />
      </div>
    {/each}
    <button class="btn btn-ghost add" onclick={addPower}><Icon name="plus" size={18} />{t('pwe.add')}</button>
  </section>
{/if}

<style>
  .ed {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    align-items: end;
  }
  .pe {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 3px;
    background: rgba(42, 31, 23, 0.05);
    box-shadow: inset 0 0 0 1px rgba(150, 112, 62, 0.35);
  }
  .head {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .add {
    align-self: flex-start;
    padding: 0 6px;
  }
  @media (max-width: 520px) {
    .two {
      grid-template-columns: 1fr;
    }
  }
</style>
