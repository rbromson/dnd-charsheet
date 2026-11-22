<script lang="ts">
  /**
   * Лоток кубиков: выбор костей, модификатор, большая кнопка «затисни й трусни», история.
   * Ровно один d20 бросается как проверка (перевага/перешкода, крит, кості ресурсів);
   * любой другой набор — свободная формула через dice.rollFree.
   */
  import Stepper from '../../components/Stepper.svelte';
  import RollModeToggle from '../../components/RollModeToggle.svelte';
  import { press } from '../../lib/actions/press';
  import { ui, buzz } from '../../lib/stores/ui.svelte';
  import { dice, type RollEntry } from '../../lib/stores/dice.svelte';
  import { t } from '../../lib/i18n';
  import { TRAY_DICE, trayFormula, trayFormulaAscii, isSingleD20, historyValue } from './format';
  import { shapeFor } from './DieShape.svelte';
  import DiceOverlay from './DiceOverlay.svelte';
  import Tray from '../../components/Tray.svelte';

  const MAX_PER_DIE = 20;
  const RING_C = 2 * Math.PI * 112;

  let counts = $state<Partial<Record<number, number>>>({});
  let mod = $state(0);

  const formula = $derived(trayFormula(counts, mod));
  const single = $derived(isSingleD20(counts));
  const dirty = $derived(mod !== 0 || TRAY_DICE.some((d) => (counts[d] ?? 0) > 0));

  function addDie(d: number) {
    counts[d] = Math.min(MAX_PER_DIE, (counts[d] ?? 0) + 1);
  }
  function clearDie(d: number) {
    counts[d] = 0;
  }
  function clearAll() {
    counts = {};
    mod = 0;
  }

  function roll() {
    if (single) {
      dice.rollCheck({ label: formula, bonus: mod, kind: 'free' });
    } else {
      dice.rollFree(trayFormulaAscii(counts, mod), formula);
    }
  }

  // ===== «Затисни й трусни» =====
  let holding = $state(false);
  let holdKey = $state(0);
  let rattle: ReturnType<typeof setInterval> | null = null;

  function stopHold() {
    holding = false;
    if (rattle) clearInterval(rattle);
    rattle = null;
  }

  function holdDown(e: PointerEvent) {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    holding = true;
    holdKey++;
    if (rattle) clearInterval(rattle);
    rattle = setInterval(() => buzz(10), 120);
  }
  function holdUp() {
    if (!holding) return;
    stopHold();
    roll();
  }
  function holdKeyboard(e: MouseEvent) {
    // Клавиатура (Enter/Пробел) даёт click без указателя
    if (e.detail === 0) roll();
  }

  $effect(() => () => stopHold());
  $effect(() => {
    if (!ui.diceTrayOpen) stopHold();
  });

  /** Закрыть лоток вместе с показанным в нём результатом — иначе его подхватит отдельное окно. */
  function closeTray() {
    dice.close();
    ui.diceTrayOpen = false;
  }

  function showEntry(h: RollEntry) {
    dice.last = h;
    dice.overlayOpen = true;
  }

  function tone(h: RollEntry): string {
    if (h.type !== 'd20') return '';
    return h.roll.crit ? 'gold' : h.roll.fumble ? 'bad' : '';
  }
</script>

{#if ui.diceTrayOpen}
  <Tray title={t('dice.tray.title')} onclose={closeTray}>
      <!-- результат броска — здесь же, вместо выбора костей -->
      <DiceOverlay embedded />
      {#if !(dice.overlayOpen && dice.last)}
      <div class="dsel" title={t('dice.tray.dieHint')}>
        {#each TRAY_DICE as d (d)}
          {@const n = counts[d] ?? 0}
          <button
            class="die-btn"
            class:on={n > 0}
            aria-label={n > 0 ? t('dice.tray.count', { die: `d${d}`, n }) : `d${d}`}
            use:press={{ onTap: () => addDie(d), onLong: () => clearDie(d) }}
          >
            <svg class="shp" viewBox="0 0 100 100" aria-hidden="true"><polygon points={shapeFor(d)?.outline ?? ''} /></svg>
            <span class="dl">d{d}</span>
            {#if n > 0}<sup>×{n}</sup>{/if}
          </button>
        {/each}
      </div>

      <div class="row-mod">
        <span class="label">{t('dice.tray.modifier')}</span>
        <Stepper bind:value={mod} min={-10} max={10} />
        <button class="btn btn-ghost clear" disabled={!dirty} onclick={clearAll}>{t('dice.tray.clear')}</button>
      </div>

      {#if single}
        <div class="mode"><RollModeToggle /></div>
      {/if}

      <div class="hold-zone">
        <button
          class="hold"
          class:holding
          aria-label={formula}
          onpointerdown={holdDown}
          onpointerup={holdUp}
          onpointercancel={stopHold}
          onclick={holdKeyboard}
          oncontextmenu={(e) => e.preventDefault()}
        >
          <svg class="ring" viewBox="0 0 234 234" aria-hidden="true">
            <circle cx="117" cy="117" r="112" class="track" />
            {#key holdKey}
              <circle
                cx="117"
                cy="117"
                r="112"
                class="prog"
                class:run={holding}
                style:stroke-dasharray={RING_C}
                style:stroke-dashoffset={RING_C}
                transform="rotate(-90 117 117)"
              />
            {/key}
          </svg>
          <span class="face">
            <span class="big num">{formula}</span>
            <span class="sm">{t('dice.tray.hold')}</span>
          </span>
        </button>
        <div class="hint">{t('dice.tray.orTap')}</div>
      </div>

      <div class="hist-wrap">
        {#if dice.history.length}
          <div class="hist">
            {#each dice.history.slice(0, 12) as h (h.id)}
              <button class="hchip" onclick={() => showEntry(h)}>
                <span class="hl">{h.label}</span>
                <b class="tone-{tone(h)}">{historyValue(h)}</b>
              </button>
            {/each}
          </div>
        {:else}
          <div class="hist-empty">{t('dice.tray.historyEmpty')}</div>
        {/if}
      </div>
      {/if}
  </Tray>
{/if}

<style>
  .dsel {
    display: flex;
    gap: 4px;
    justify-content: center;
    flex-wrap: wrap;
    width: 100%;
  }
  .die-btn {
    position: relative;
    height: 54px;
    min-width: 38px;
    flex: 1 1 0;
    max-width: 64px;
    padding: 0 2px;
    border-radius: 12px;
    color: var(--parch);
    font-weight: 700;
    font-size: 13.5px;
    user-select: none;
    -webkit-touch-callout: none;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.22);
    box-shadow:
      inset 0 0 0 1px rgba(214, 170, 110, 0.25),
      inset 0 1px 0 rgba(255, 220, 170, 0.06);
    transition:
      transform 0.15s var(--ease-spring),
      background 0.15s,
      box-shadow 0.15s,
      color 0.15s;
  }
  .shp {
    position: absolute;
    inset: 5px;
    width: calc(100% - 10px);
    height: calc(100% - 10px);
    fill: rgba(232, 116, 59, 0.06);
    stroke: rgba(214, 170, 110, 0.45);
    stroke-width: 4;
    stroke-linejoin: round;
    transition:
      fill 0.15s,
      stroke 0.15s;
  }
  .dl {
    position: relative;
  }
  .die-btn:active {
    transform: scale(0.9) rotate(-6deg);
  }
  .die-btn.on .shp {
    fill: rgba(232, 116, 59, 0.28);
    stroke: var(--ember);
  }
  .die-btn.on {
    border-color: var(--ember);
    color: var(--ember);
    background: var(--ember-soft);
  }
  .die-btn sup {
    position: absolute;
    top: -7px;
    right: -5px;
    font-size: 10.5px;
    line-height: 1;
    background: var(--ember);
    color: var(--ember-ink);
    border-radius: 8px;
    padding: 2px 5px;
  }

  .row-mod {
    display: grid;
    grid-template-columns: auto minmax(max-content, 1fr) auto;
    gap: 6px;
    justify-items: center;
    align-items: center;
    gap: 8px;
    width: 100%;
    color: var(--parch);
  }
  .row-mod .label {
    margin: 0;
    letter-spacing: 0.02em;
    justify-self: start;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .row-mod .clear {
    justify-self: end;
  }
  @media (max-width: 420px) {
    .row-mod .label {
      font-size: 10.5px;
      letter-spacing: 0;
    }
    .row-mod .clear {
      font-size: 13px;
      padding: 0 4px;
    }
  }
  .clear {
    padding: 0 6px;
    color: var(--muted);
  }
  .mode {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .hold-zone {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 12px 0 2px;
  }
  .hold {
    position: relative;
    width: 210px;
    height: 210px;
    border-radius: 50%;
    flex-shrink: 0;
    touch-action: none;
    user-select: none;
    -webkit-touch-callout: none;
    color: #2a1208;
    transition: transform 0.12s;
  }
  .hold::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #f6a36f, var(--ember) 55%, #a9461c);
    box-shadow:
      0 0 50px var(--ember-glow),
      inset 0 -8px 20px rgba(0, 0, 0, 0.25);
    transition: transform 1.2s ease-out;
  }
  .hold:active {
    transform: scale(0.98);
  }
  .hold.holding::before {
    transform: scale(1.05);
  }
  .ring {
    position: absolute;
    inset: -12px;
    width: 234px;
    height: 234px;
    pointer-events: none;
  }
  .track {
    fill: none;
    stroke: rgba(232, 116, 59, 0.2);
    stroke-width: 5;
  }
  .prog {
    fill: none;
    stroke: var(--gold);
    stroke-width: 5;
    stroke-linecap: round;
    opacity: 0;
  }
  .prog.run {
    opacity: 1;
    animation: fill-ring 1.2s linear forwards;
  }
  .face {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 18px;
  }
  .hold.holding {
    animation: shake 0.11s linear infinite;
  }
  .big {
    font-size: 30px;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
  .sm {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    margin-top: 4px;
  }
  .hint {
    font-size: 12px;
    color: var(--muted);
  }

  .hist-wrap {
    width: 100%;
  }
  .hist {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: center;
    max-height: 104px;
    overflow-y: auto;
  }
  .hchip {
    min-height: 40px;
    max-width: 100%;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12.5px;
    color: #cdb898;
    background: #2a201a;
    border-radius: 10px;
    padding: 6px 10px;
  }
  .hchip:active {
    transform: scale(0.97);
  }
  .hl {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 150px;
  }
  .hchip b {
    color: var(--parch);
    font-family: var(--font-serif);
    font-size: 14px;
  }
  .hchip b.tone-gold {
    color: var(--gold);
  }
  .hchip b.tone-bad {
    color: var(--bad);
  }
  .hist-empty {
    text-align: center;
    font-size: 12.5px;
    color: var(--muted);
  }

  /* Книжная / узкая: нижний лист на всю ширину */

  /* Низкий экран: кнопка поменьше */
  @media (max-height: 640px) {
    .hold {
      width: 170px;
      height: 170px;
    }
    .ring {
      width: 194px;
      height: 194px;
    }
    .hold-zone {
      padding-top: 10px;
    }
  }

  /* Планшет горизонтально: лоток сбоку — компактная кнопка броска */
  @media (min-width: 761px) and (orientation: landscape) {
    .hold {
      width: 150px;
      height: 150px;
    }
    .ring {
      width: 174px;
      height: 174px;
    }
    .big {
      font-size: 26px;
    }
    .sm {
      font-size: 10px;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }
    .face {
      padding: 0 8px;
    }
    .hold-zone {
      gap: 8px;
      padding-top: 14px;
    }
  }
  @keyframes fill-ring {
    to {
      stroke-dashoffset: 0;
    }
  }
  @keyframes shake {
    0% {
      transform: translate(0, 0) rotate(0);
    }
    25% {
      transform: translate(-2px, 1px) rotate(-2deg);
    }
    50% {
      transform: translate(2px, -1px) rotate(1.5deg);
    }
    75% {
      transform: translate(-1px, -2px) rotate(-1deg);
    }
    100% {
      transform: translate(0, 0) rotate(0);
    }
  }
</style>
