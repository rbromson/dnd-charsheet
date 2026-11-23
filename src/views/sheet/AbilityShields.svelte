<script lang="ts">
  /** Шесть «щитов» характеристик. Тап — проверка, долгий тап / правка — карточка. */
  import AbilitySheet from './AbilitySheet.svelte';
  import { ABILITIES, type Ability } from '../../lib/model/types';
  import { press } from '../../lib/actions/press';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { abilityCheck, abilityScore, fmt, mod } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  const open = (a: Ability) => ui.openSheet(AbilitySheet, { ability: a });
  function setScore(a: Ability, v: string) {
    const n = Math.round(Number(v));
    if (Number.isFinite(n) && n >= 1) c.abilities[a] = Math.min(30, n);
  }
  function next(e: KeyboardEvent, i: number) {
    const el = e.currentTarget as HTMLInputElement;
    setScore(ABILITIES[i], el.value);
    const all = [...(el.closest('.shields')?.querySelectorAll<HTMLInputElement>('input.sin') ?? [])];
    const n = all[i + 1];
    if (n) {
      e.preventDefault();
      n.focus();
    } else el.blur();
  }
  function roll(a: Ability) {
    dice.askCheck({ kind: 'ability', ability: a, label: t('sheet.checkLabel', { ability: t(`ability.${a}`) }), bonus: abilityCheck(c, a) });
  }
</script>

<div class="wrap">
<div class="shields">
  {#each ABILITIES as a, i (a)}
    {#if ui.editing}
      <!-- Правка: шість чисел підряд, Enter — до наступної; «…» — повна картка (рятунок, нотатки) -->
      <div class="sh editing">
        <svg viewBox="0 0 130 112" preserveAspectRatio="none" aria-hidden="true">
          <path d="M8 5h114v62c0 20-30 36-57 41C38 103 8 87 8 67z" />
        </svg>
        <span class="l">{t(`ability.${a}`)}</span>
        <input
          class="sin num"
          type="number"
          inputmode="numeric"
          min="1"
          max="30"
          enterkeyhint={i < 5 ? 'next' : 'done'}
          aria-label={t(`ability.${a}`)}
          value={c.abilities[a]}
          onfocus={(e) => (e.currentTarget as HTMLInputElement).select()}
          onchange={(e) => setScore(a, (e.currentTarget as HTMLInputElement).value)}
          onkeydown={(e) => e.key === 'Enter' && next(e, i)}
        />
        <button class="more" aria-label={t('sheet.abilityMore', { a: t(`ability.${a}`) })} onclick={() => open(a)}>{fmt(mod(c, a))}<span class="dots">⋯</span></button>
      </div>
    {:else}
    <button
      class="sh"
      class:editing={ui.editing}
      aria-label={`${t(`ability.${a}`)} ${fmt(mod(c, a))}`}
      use:press={{ onTap: () => (ui.editing ? open(a) : roll(a)), onLong: () => open(a) }}
    >
      <svg viewBox="0 0 130 112" preserveAspectRatio="none" aria-hidden="true">
        <path d="M8 5h114v62c0 20-30 36-57 41C38 103 8 87 8 67z" />
      </svg>
      <span class="l">{t(`ability.${a}`)}</span>
      <!-- з урахуванням предметів і зілль (Рукавиці огра, Зілля сили) — золотом, якщо змінено -->
      <span class="m">{fmt(mod(c, a))}</span>
      <span class="s" class:boost={abilityScore(c, a) !== c.abilities[a]}>{abilityScore(c, a)}</span>
    </button>
    {/if}
  {/each}
</div>
</div>

<style>
  .sin {
    position: relative;
    width: 64px;
    margin-top: 2px;
    text-align: center;
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 30px;
    line-height: 1.1;
    color: var(--ink);
    background: rgba(255, 250, 235, 0.55);
    border: 0;
    border-radius: 3px;
    box-shadow:
      inset 0 1px 3px rgba(80, 50, 20, 0.25),
      inset 0 0 0 1px rgba(150, 112, 62, 0.45);
    -moz-appearance: textfield;
    appearance: textfield;
  }
  .sin::-webkit-inner-spin-button,
  .sin::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  .more {
    position: relative;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding: 0 8px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    color: var(--parch);
    background: var(--bg2);
  }
  .dots {
    opacity: 0.7;
  }
  .s.boost {
    background: linear-gradient(180deg, #e6b450, #9a6a2a) !important;
    color: #1a1206 !important;
  }
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
