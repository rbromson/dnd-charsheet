<script lang="ts">
  /** Свой предмет: пассивные эффекты (+N до перевірок, швидкість, темний зір…). Действуют, пока предмет надет/налаштований. */
  import Icon from '../../components/Icon.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { uid } from '../../lib/model/ids';
  import { t } from '../../lib/i18n';
  import { MOD_TARGETS, modText } from './modText';

  let { itemId }: { itemId: string } = $props();
  const item = $derived(charStore.current?.equipment.find((x) => x.id === itemId));

  function label(target: string): string {
    return modText({ id: '', t: target, op: target === 'speed' ? 'add' : target === 'darkvision' || target === 'acBase' ? 'set' : 'add', v: 0, cap: null, perLevel: false, when: '' })
      .replace(/[+−]?0\s?/, 'N ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function add() {
    item?.mods.push({ id: uid(), t: 'check', op: 'add', v: 1, cap: null, perLevel: false, when: '' });
  }
</script>

{#if item}
  <section class="ed">
    <span class="label">{t('mod.edTitle')}</span>
    {#each item.mods as m, i (m.id)}
      {#if m.when}
        <div class="hint">{m.when}<button class="btn btn-ghost x" aria-label={t('common.delete')} onclick={() => item.mods.splice(i, 1)}><Icon name="trash" size={16} /></button></div>
      {:else}
        <div class="row">
          <select class="field tg" bind:value={m.t} aria-label={t('mod.target')}>
            {#each MOD_TARGETS as tg (tg)}<option value={tg}>{label(tg)}</option>{/each}
          </select>
          <select class="field op" bind:value={m.op} aria-label={t('mod.target')}>
            <option value="add">{t('mod.op.add')}</option>
            <option value="set">{t('mod.op.set')}</option>
            <option value="min">{t('mod.op.min')}</option>
          </select>
          <div class="v"><NumberField bind:value={m.v} min={-10} max={300} /></div>
          <button class="btn btn-ghost x" aria-label={t('common.delete')} onclick={() => item.mods.splice(i, 1)}><Icon name="trash" size={16} /></button>
        </div>
        <div class="prev">{modText(m)}</div>
      {/if}
    {/each}
    <button class="btn btn-ghost addm" onclick={add}><Icon name="plus" size={18} />{t('mod.add')}</button>
  </section>
{/if}

<style>
  .ed {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .row {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .tg {
    flex: 1 1 auto;
    min-width: 0;
  }
  .op {
    width: 96px;
    flex-shrink: 0;
  }
  .v {
    width: 76px;
    flex-shrink: 0;
  }
  .x {
    width: 36px;
    padding: 0;
    flex-shrink: 0;
  }
  .prev,
  .hint {
    font-size: 12.5px;
    color: var(--ink2);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .addm {
    align-self: flex-start;
    padding: 0 6px;
  }
</style>
