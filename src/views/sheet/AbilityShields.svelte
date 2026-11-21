<script lang="ts">
  /** Шесть «щитов» характеристик. Тап — проверка, долгий тап / правка — карточка. */
  import AbilitySheet from './AbilitySheet.svelte';
  import { ABILITIES, type Ability } from '../../lib/model/types';
  import { press } from '../../lib/actions/press';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { abilityMod, fmt } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  const open = (a: Ability) => ui.openSheet(AbilitySheet, { ability: a });
  function roll(a: Ability) {
    dice.rollCheck({ kind: 'ability', label: t('sheet.checkLabel', { ability: t(`ability.${a}`) }), bonus: abilityMod(c.abilities[a]) });
  }
</script>

<div class="wrap">
<div class="shields">
  {#each ABILITIES as a (a)}
    <button
      class="sh"
      class:editing={ui.editing}
      aria-label={`${t(`ability.${a}`)} ${fmt(abilityMod(c.abilities[a]))}`}
      use:press={{ onTap: () => (ui.editing ? open(a) : roll(a)), onLong: () => open(a) }}
    >
      <svg viewBox="0 0 130 112" preserveAspectRatio="none" aria-hidden="true">
        <path d="M8 5h114v62c0 20-30 36-57 41C38 103 8 87 8 67z" />
      </svg>
      <span class="l">{t(`ability.${a}`)}</span>
      <span class="m">{fmt(abilityMod(c.abilities[a]))}</span>
      <span class="s">{c.abilities[a]}</span>
    </button>
  {/each}
</div>
</div>

<style>
  .wrap {
    container-type: inline-size;
  }
  .shields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  @container (min-width: 300px) {
    .shields {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  @container (min-width: 620px) {
    .shields {
      grid-template-columns: repeat(6, 1fr);
    }
  }
  .sh {
    position: relative;
    height: 112px;
    display: flex;
    flex-direction: column;
    align-items: center;
    user-select: none;
    transition: transform 0.08s;
  }
  .sh:active {
    transform: scale(0.97);
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  path {
    fill: color-mix(in srgb, var(--ink) 6%, transparent);
    stroke: var(--ink2);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }
  .sh:active path,
  .sh.editing path {
    fill: color-mix(in srgb, var(--ember) 12%, transparent);
  }
  .sh.editing path {
    stroke-dasharray: 5 4;
  }
  .l {
    position: relative;
    font-family: var(--font-sc);
    font-weight: 700;
    font-size: 11.5px;
    letter-spacing: 0.06em;
    margin-top: 10px;
    color: var(--ink2);
    text-transform: uppercase;
  }
  .m {
    position: relative;
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 38px;
    line-height: 1;
    margin-top: 3px;
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .s {
    position: relative;
    margin-top: 5px;
    min-width: 42px;
    height: 24px;
    padding: 0 8px;
    border-radius: 12px;
    background: var(--bg2);
    color: var(--parch);
    font-weight: 600;
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
