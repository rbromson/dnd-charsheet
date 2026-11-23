<script lang="ts">
  /** Кубики здоров'я: остаток. Тратятся в лотке «Привал» на коротком відпочинку. Мультиклас — кілька пулів. */
  import Stepper from '../../components/Stepper.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { uid } from '../../lib/model/ids';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  type P = { die: string; total: number; used: number };
  const all = $derived<P[]>([c.hitDice, ...c.hitDiceMore]);

  const dieOptions = ['d6', 'd8', 'd10', 'd12'].map((d) => ({ value: d, label: d }));
  const leftOf = (p: P) => Math.max(0, p.total - p.used);

  function addPool() {
    c.hitDiceMore.push({ id: uid(), die: 'd6', total: 1, used: 0 });
  }
</script>

<section class="card">
  <h3 class="card-title">{t('combat.hitDice')}</h3>
  {#if ui.editing}
    {#each all as p, i (i)}
      <div class="edit" class:more={i > 0}>
        <div class="dh">
          <div class="grow">
            <span class="label">{i === 0 ? t('combat.die') : t('combat.dieMore')}</span>
            <Segmented bind:value={p.die} options={dieOptions} />
          </div>
          {#if i > 0}
            <button class="btn btn-ghost x" aria-label={t('common.delete')} onclick={() => c.hitDiceMore.splice(i - 1, 1)}><Icon name="trash" size={18} /></button>
          {/if}
        </div>
        <div class="two">
          <NumberField
            label={t('combat.total')}
            bind:value={p.total}
            min={0}
            max={40}
            onchange={(v) => {
              if (v != null && p.used > v) p.used = v;
            }}
          />
          <div>
            <span class="label">{t('combat.left')}</span>
            <Stepper bind:value={() => leftOf(p), (v) => (p.used = p.total - v)} min={0} max={p.total} />
          </div>
        </div>
      </div>
    {/each}
    <button class="btn btn-ghost addp" onclick={addPool}><Icon name="plus" size={18} />{t('combat.diePoolAdd')}</button>
  {:else}
    {#each all.filter((p, i) => i === 0 || p.total > 0) as p, i (i)}
      {@const die = (p.die || 'd8').toLowerCase()}
      <div class="row line" class:more={i > 0}>
        <div class="grow">
          <div class="big num">{die}</div>
          <div class="sub">{t('combat.hitDiceSub', { die, left: leftOf(p), total: p.total })}</div>
        </div>
        <Stepper bind:value={() => leftOf(p), (v) => (p.used = p.total - v)} min={0} max={p.total} />
      </div>
    {/each}
  {/if}
</section>

<style>
  .line {
    flex-wrap: wrap;
  }
  .line.more,
  .edit.more {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed rgba(150, 112, 62, 0.4);
  }
  .big {
    font-size: 26px;
    line-height: 1.1;
  }
  .sub {
    font-size: 12px;
    color: var(--ink2);
  }
  .edit {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .dh {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }
  .x {
    width: 40px;
    padding: 0;
  }
  .two {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    align-items: end;
  }
  .addp {
    align-self: flex-start;
    margin-top: 8px;
    padding: 0 6px;
  }
</style>
