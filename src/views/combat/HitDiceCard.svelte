<script lang="ts">
  /** Кубики здоров'я: остаток. Тратятся в лотке «Привал» на коротком відпочинку. */
  import Stepper from '../../components/Stepper.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  const die = $derived((c.hitDice.die || 'd8').toLowerCase());
  const left = $derived(Math.max(0, c.hitDice.total - c.hitDice.used));

  const dieOptions = ['d6', 'd8', 'd10', 'd12'].map((d) => ({ value: d, label: d }));
</script>

<section class="card">
  <h3 class="card-title">{t('combat.hitDice')}</h3>
  {#if ui.editing}
    <div class="edit">
      <div>
        <span class="label">{t('combat.die')}</span>
        <Segmented bind:value={c.hitDice.die} options={dieOptions} />
      </div>
      <div class="two">
        <NumberField
          label={t('combat.total')}
          bind:value={c.hitDice.total}
          min={0}
          max={40}
          onchange={(v) => {
            if (v != null && c.hitDice.used > v) c.hitDice.used = v;
          }}
        />
        <div>
          <span class="label">{t('combat.left')}</span>
          <Stepper bind:value={() => left, (v) => (c.hitDice.used = c.hitDice.total - v)} min={0} max={c.hitDice.total} />
        </div>
      </div>
    </div>
  {:else}
    <div class="row line">
      <div class="grow">
        <div class="big num">{die}</div>
        <div class="sub">{t('combat.hitDiceSub', { die, left, total: c.hitDice.total })}</div>
      </div>
      <Stepper bind:value={() => left, (v) => (c.hitDice.used = c.hitDice.total - v)} min={0} max={c.hitDice.total} />
    </div>
  {/if}
</section>

<style>
  .line {
    flex-wrap: wrap;
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
  .two {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    align-items: end;
  }
</style>
