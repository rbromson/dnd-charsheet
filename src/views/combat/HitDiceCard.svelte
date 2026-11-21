<script lang="ts">
  /** Кубики здоров'я: остаток, «Витратити» = бросок кости + мод Статури и лечение. */
  import Stepper from '../../components/Stepper.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { mod } from '../../lib/rules/calc';
  import { applyHeal } from '../../lib/rules/hp';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  const die = $derived((c.hitDice.die || 'd8').toLowerCase());
  const left = $derived(Math.max(0, c.hitDice.total - c.hitDice.used));

  const formula = $derived.by(() => {
    const m = mod(c, 'con');
    return `1${die}${m > 0 ? `+${m}` : m < 0 ? `-${-m}` : ''}`;
  });

  const dieOptions = ['d6', 'd8', 'd10', 'd12'].map((d) => ({ value: d, label: d }));

  function spend() {
    if (left <= 0) return;
    const e = dice.rollDamage(t('combat.hitDieLabel'), formula);
    const gain = e.type === 'formula' ? Math.max(0, e.roll.total) : 0;
    const from = c.hp.current;
    const next = applyHeal(c.hp, gain);
    charStore.update(
      (ch) => {
        ch.hitDice.used = Math.min(ch.hitDice.total, ch.hitDice.used + 1);
        ch.hp = next;
        if (from === 0 && next.current > 0) ch.deathSaves = { success: 0, fail: 0 };
      },
      { undo: t('combat.hitDieToast', { n: gain, from, to: next.current }) },
    );
  }
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
    <button class="btn btn-ink spend" disabled={left <= 0} onclick={spend}>
      <Icon name="heart" size={20} />{t('combat.spend')} · {formula.replace('-', '−')}
    </button>
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
  .spend {
    width: 100%;
    margin-top: 10px;
    min-height: 52px;
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
