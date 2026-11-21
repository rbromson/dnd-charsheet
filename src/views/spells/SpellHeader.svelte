<script lang="ts">
  /** Шапка как в PDF (стр. 3): клас заклинателя, базовая характеристика, СК и бонус атаки. */
  import NumberField from '../../components/NumberField.svelte';
  import TextField from '../../components/TextField.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ABILITIES } from '../../lib/model/types';
  import { mod, spellDC, spellDCAuto, spellAttack, spellAttackAuto, fmt } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  const sc = $derived(c.spellcasting);

  function rollAttack() {
    dice.askCheck({ kind: 'attack', label: t('spells.attackRoll'), bonus: spellAttack(c) });
  }
</script>

{#if ui.editing}
  <section class="card stack">
    <Toggle bind:checked={sc.enabled} label={t('spells.enabled')} />
    <TextField bind:value={sc.className} label={t('spells.className')} placeholder={t('spells.classPlaceholder')} serif />
    <div>
      <span class="label">{t('spells.ability')}</span>
      <div class="chips">
        {#each ABILITIES as a (a)}
          <button class="chip" class:on={sc.ability === a} aria-pressed={sc.ability === a} onclick={() => (sc.ability = a)}>
            {t(`ability.${a}`)}
          </button>
        {/each}
      </div>
    </div>
    <div class="pair">
      <div>
        <NumberField bind:value={sc.dcOverride} nullable label={t('spells.dc')} placeholder={String(spellDCAuto(c))} />
        <div class="hint muted">{t('spells.autoValue', { v: spellDCAuto(c) })}</div>
      </div>
      <div>
        <NumberField bind:value={sc.attackOverride} nullable label={t('spells.attack')} placeholder={fmt(spellAttackAuto(c))} />
        <div class="hint muted">{t('spells.autoValue', { v: fmt(spellAttackAuto(c)) })}</div>
      </div>
    </div>
    <div class="hint muted">{t('spells.manualHint')}</div>
  </section>
{:else}
  <section class="head">
    <div class="card cell cls">
      <span class="label">{t('spells.className')}</span>
      <div class="serif big">{sc.className.trim() || '—'}</div>
    </div>
    <div class="card cell">
      <span class="label">{t('spells.ability')}</span>
      <div class="ab">
        <span class="serif big">{t(`ability.${sc.ability}`)}</span>
        <span class="pill num">{fmt(mod(c, sc.ability))}</span>
      </div>
    </div>
    <div class="tile wine">
      <span class="ic"><Icon name="shield" size={18} stroke={2.2} /></span>
      <span class="k">{t('spells.dc')}</span>
      <span class="v num">{spellDC(c)}</span>
      <span class="s">{sc.dcOverride != null ? t('common.manual') : t('common.auto')}</span>
    </div>
    <button class="tile ember" onclick={rollAttack}>
      <span class="ic"><Icon name="dice" size={18} stroke={2.2} /></span>
      <span class="k">{t('spells.attack')}</span>
      <span class="v num">{fmt(spellAttack(c))}</span>
      <span class="s">{t('spells.tapToRoll')}</span>
    </button>
  </section>
{/if}

<style>
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chips .chip {
    min-height: var(--tap);
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .hint {
    font-size: 12.5px;
    margin-top: 4px;
  }

  .head {
    display: grid;
    gap: 10px;
    grid-template-columns: 1fr 1fr;
  }
  @container (min-width: 760px) {
    .head {
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
    }
  }
  .cell {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 92px;
  }
  .big {
    font-size: 24px;
    font-weight: 700;
    line-height: 1.15;
    overflow-wrap: anywhere;
  }
  .ab {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .pill {
    min-width: 42px;
    height: 26px;
    padding: 0 8px;
    border-radius: 13px;
    background: var(--bg2);
    color: var(--parch);
    font-size: 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  /* Кожаные пластины, как плитки на «Аркуші»: цвет — только акцент */
  .tile {
    position: relative;
    isolation: isolate;
    border-radius: var(--r);
    padding: 11px 14px;
    min-height: 92px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
    color: var(--parch);
    text-align: right;
    overflow: hidden;
    background: var(--leather);
    background-size: var(--leather-size);
    box-shadow:
      var(--leather-shadow),
      inset 0 -3px 0 -1px var(--acc),
      0 10px 22px -10px rgba(0, 0, 0, 0.85);
    transition: transform 0.12s var(--ease);
  }
  .tile::after {
    content: '';
    position: absolute;
    inset: 5px 5px 7px;
    border-radius: calc(var(--r) - 5px);
    border: 1.5px dashed var(--stitch);
    pointer-events: none;
  }
  .tile::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: radial-gradient(ellipse 70% 90% at 0% 0%, color-mix(in srgb, var(--acc) 30%, transparent), transparent 65%);
  }
  .wine {
    --acc: #c45876;
  }
  .ember {
    --acc: #e0703f;
  }
  button.tile:active {
    transform: scale(0.98);
  }
  .ic {
    position: absolute;
    left: 12px;
    top: 11px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1a0f08;
    background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--acc) 55%, white), var(--acc) 55%, color-mix(in srgb, var(--acc) 70%, black));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      inset 0 -2px 3px rgba(0, 0, 0, 0.3),
      0 0 0 2px rgba(0, 0, 0, 0.35),
      0 0 14px color-mix(in srgb, var(--acc) 45%, transparent);
  }
  .k {
    font-size: 10.5px;
    letter-spacing: 0.12em;
    font-weight: 700;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--acc) 70%, var(--parch));
    padding-left: 40px;
    line-height: 1.2;
  }
  .v {
    font-size: 40px;
    line-height: 1;
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 18px color-mix(in srgb, var(--acc) 30%, transparent);
  }
  .s {
    font-size: 11px;
    color: var(--muted);
  }
</style>
