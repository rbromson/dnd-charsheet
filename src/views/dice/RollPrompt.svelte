<script lang="ts">
  /**
   * Подготовка броска d20: тап по стату открывает это окно, здесь выбирается
   * перешкода / звичайний / перевага, а кость бросается вторым нажатием.
   */
  import DieShape from './DieShape.svelte';
  import Icon from '../../components/Icon.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { fmt } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';
  import type { RollMode } from '../../lib/dice/d20';

  const p = $derived(dice.pending);
  const req = $derived(p?.req ?? null);
  const two = $derived(dice.mode !== 'normal');

  const notes = $derived.by(() => {
    if (!req) return [] as string[];
    const out: string[] = [];
    if (req.minD20) out.push(t('roll.prompt.min', { n: req.minD20 }));
    if (charStore.current?.rules.rerollOnes) out.push(t('roll.prompt.reroll'));
    return out;
  });

  const modes: { value: RollMode; label: string; icon: string }[] = [
    { value: 'dis', label: 'roll.dis', icon: 'minus' },
    { value: 'normal', label: 'roll.normal', icon: 'dice' },
    { value: 'adv', label: 'roll.adv', icon: 'plus' },
  ];

  function onKey(e: KeyboardEvent) {
    if (!p) return;
    if (e.key === 'Escape') dice.cancelPending();
    else if (e.key === 'Enter') {
      e.preventDefault();
      dice.confirmPending();
    }
  }
</script>

<svelte:window onkeydown={onKey} />

{#if req}
  <div class="layer">
    <button class="scrim" aria-label={t('roll.prompt.cancel')} onclick={() => dice.cancelPending()}></button>
    <div class="box" role="dialog" aria-modal="true" aria-label={req.label}>
      <div class="kick">{t('roll.prompt.kicker')}</div>
      <div class="tt">{req.label}</div>
      <div class="bonus num">d20 {fmt(req.bonus)}</div>

      <div class="modes" role="radiogroup" aria-label={t('roll.prompt.mode')}>
        {#each modes as m (m.value)}
          <button
            class="md md-{m.value}"
            class:on={dice.mode === m.value}
            role="radio"
            aria-checked={dice.mode === m.value}
            onclick={() => (dice.mode = m.value)}
          >
            <Icon name={m.icon} size={18} stroke={2.2} />
            <span>{t(m.label)}</span>
          </button>
        {/each}
      </div>

      <button class="throw" class:two class:adv={dice.mode === 'adv'} class:dis={dice.mode === 'dis'} onclick={() => dice.confirmPending()}>
        <span class="dice">
          <span class="d d1"><DieShape sides={20} value="20" size={two ? 104 : 128} tone="ember" /></span>
          {#if two}<span class="d d2"><DieShape sides={20} value="20" size={104} tone={dice.mode === 'adv' ? 'gold' : 'bad'} /></span>{/if}
        </span>
        <span class="cta">{t('roll.prompt.tap')}</span>
      </button>

      {#if notes.length}
        <div class="notes">
          {#each notes as n, i (i)}<span class="note">{n}</span>{/each}
        </div>
      {/if}

      <button class="cancel" onclick={() => dice.cancelPending()}>{t('roll.prompt.cancel')}</button>
    </div>
  </div>
{/if}

<style>
  .layer {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    pointer-events: none;
  }
  .scrim {
    position: absolute;
    inset: 0;
    background: rgba(8, 5, 4, 0.62);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    pointer-events: auto;
    cursor: default;
    animation: fade 0.18s ease-out both;
  }
  .box {
    pointer-events: auto;
    position: relative;
    width: min(440px, 100%);
    max-height: calc(100dvh - 32px);
    overflow-y: auto;
    padding: 22px 20px 14px;
    text-align: center;
    color: var(--parch);
    border-radius: 24px;
    background: var(--leather);
    background-size: var(--leather-size);
    box-shadow: var(--leather-shadow), 0 0 70px rgba(232, 116, 59, 0.22), var(--shadow-pop);
    animation: box-in 0.24s var(--ease) both;
  }
  .box::after {
    content: '';
    position: absolute;
    inset: 7px;
    border-radius: 18px;
    border: 1.5px dashed var(--stitch);
    pointer-events: none;
  }
  .kick {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--gold);
    opacity: 0.85;
  }
  .tt {
    font-family: var(--font-sc);
    font-weight: 700;
    font-size: 24px;
    line-height: 1.15;
    margin-top: 2px;
    overflow-wrap: anywhere;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6);
  }
  .bonus {
    font-size: 18px;
    color: #cdb898;
    margin-top: 2px;
  }

  .modes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin: 16px 0 4px;
    padding: 5px;
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.32);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(255, 220, 170, 0.06);
  }
  .md {
    min-height: 52px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-size: 13px;
    font-weight: 600;
    color: #b9a487;
    transition:
      background 0.2s,
      color 0.2s,
      box-shadow 0.2s,
      transform 0.12s var(--ease);
  }
  .md:active {
    transform: scale(0.95);
  }
  .md.on {
    color: var(--ink);
    background: var(--paper);
    background-size: 180px 180px, 520px 520px, 100% 100%;
    box-shadow:
      inset 0 0 0 1px rgba(150, 112, 62, 0.6),
      inset 0 1px 0 rgba(255, 250, 235, 0.6),
      0 4px 10px -4px rgba(0, 0, 0, 0.6);
  }
  .md-dis.on {
    color: #8e2f20;
  }
  .md-adv.on {
    color: #7a5a10;
  }

  .throw {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: 14px 0 6px;
    border-radius: 18px;
  }
  .dice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 136px;
  }
  .d {
    display: flex;
    animation: breathe 2.2s ease-in-out infinite;
  }
  .d2 {
    animation-delay: 0.3s;
  }
  .throw:active .d {
    transform: scale(0.92) rotate(-8deg);
  }
  .cta {
    margin-top: 8px;
    font-family: var(--font-sc);
    font-weight: 700;
    letter-spacing: 0.12em;
    font-size: 13px;
    text-transform: uppercase;
    color: var(--ember);
  }
  .adv .cta {
    color: var(--gold);
  }
  .notes {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin-top: 6px;
  }
  .note {
    font-size: 11.5px;
    font-weight: 700;
    color: var(--ember);
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 3px 8px;
  }
  .cancel {
    margin-top: 8px;
    min-height: var(--tap);
    width: 100%;
    border-radius: 12px;
    color: var(--muted);
    font-weight: 600;
  }

  @keyframes breathe {
    0%,
    100% {
      transform: translateY(0);
      filter: drop-shadow(0 0 10px rgba(232, 116, 59, 0.25));
    }
    50% {
      transform: translateY(-4px);
      filter: drop-shadow(0 0 22px rgba(232, 116, 59, 0.55));
    }
  }
  @keyframes box-in {
    from {
      opacity: 0;
      transform: translateY(14px) scale(0.96);
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
</style>
