<script lang="ts">
  /**
   * Лоток «Привал»: короткий / довгий відпочинок с предпросмотром того, что вернётся.
   * На коротком — трата кубиков здоров'я (бросок показывается здесь же, как в лотке кубиков).
   */
  import { onDestroy, untrack } from 'svelte';
  import Tray from '../../components/Tray.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import Icon from '../../components/Icon.svelte';
  import DiceOverlay from '../dice/DiceOverlay.svelte';
  import { ui, buzz } from '../../lib/stores/ui.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { applyRest, restPreview, type RestKind } from '../../lib/rules/rest';
  import { applyHeal } from '../../lib/rules/hp';
  import { mod } from '../../lib/rules/calc';
  import { dieText, has, t } from '../../lib/i18n';

  let kind = $state<RestKind>('short');

  const c = $derived(charStore.current);
  const die = $derived((c?.hitDice.die || 'd8').toLowerCase());
  const left = $derived(c ? Math.max(0, c.hitDice.total - c.hitDice.used) : 0);
  const formula = $derived.by(() => {
    if (!c) return '';
    const m = mod(c, 'con');
    return `1${die}${m > 0 ? `+${m}` : m < 0 ? `-${-m}` : ''}`;
  });

  const rows = $derived(
    c
      ? restPreview(c, kind).map(([k, v]) => {
          const key = `combat.restKey.${k}`;
          return { name: ['hp', 'temp', 'hitDice', 'slots', 'effects', 'daily'].includes(k) && has(key) ? t(key) : k, value: dieText(v) };
        })
      : [],
  );

  const showing = $derived(dice.overlayOpen && !!dice.last);

  function close() {
    dice.close();
    ui.restOpen = false;
  }

  /** Кубик здоров'я: бросок сразу, а лечение и подсказка — когда кость приземлится (без спойлера в ОЗ). */
  let pendingHeal = $state<{ seq: number; gain: number } | null>(null);

  function spendHitDie() {
    if (!c || left <= 0 || pendingHeal) return;
    const e = dice.rollDamage(t('combat.hitDieLabel'), formula, false, true);
    const gain = e.type === 'formula' ? Math.max(0, e.roll.total) : 0;
    pendingHeal = { seq: dice.seq, gain };
  }

  function applyPendingHeal() {
    const p = pendingHeal;
    const ch0 = charStore.current;
    if (!p || !ch0) return;
    pendingHeal = null;
    const from = ch0.hp.current;
    const next = applyHeal(ch0.hp, p.gain);
    charStore.update(
      (ch) => {
        ch.hitDice.used = Math.min(ch.hitDice.total, ch.hitDice.used + 1);
        ch.hp = next;
        if (from === 0 && next.current > 0) ch.deathSaves = { success: 0, fail: 0 };
      },
      { undo: t('combat.hitDieToast', { n: p.gain, from, to: next.current }) },
    );
  }

  $effect(() => {
    const l = dice.landed;
    untrack(() => {
      if (pendingHeal && l >= pendingHeal.seq) applyPendingHeal();
    });
  });
  // закрыли «Привал», не дождавшись кости — лечение всё равно положено
  onDestroy(() => applyPendingHeal());

  function rest() {
    const k = kind;
    let rolls: { name: string; regain: string; got: number }[] = [];
    const done = t(k === 'short' ? 'combat.restDoneShort' : 'combat.restDoneLong');
    charStore.update(
      (ch) => {
        rolls = applyRest(ch, k);
      },
      // заряды «на світанку» бросаются — показываем, сколько вернулось
      { undo: () => (rolls.length ? `${done} · ${rolls.map((r) => t('rest.regained', { name: r.name, n: r.got, f: dieText(r.regain) })).join(' · ')}` : done) },
    );
    buzz([15, 40, 15]);
    close();
  }
</script>

{#if ui.restOpen && c}
  <Tray title={t('rest.title')} onclose={close}>
    <!-- бросок кубика здоров'я — здесь же, вместо содержимого привалу -->
    <DiceOverlay embedded />
    {#if !showing}
      <div class="kind">
        <Segmented
          bind:value={kind}
          options={[
            { value: 'short', label: t('rest.short') },
            { value: 'long', label: t('rest.long') },
          ]}
        />
      </div>

      <div class="scene" class:long={kind === 'long'} aria-hidden="true">
        <Icon name={kind === 'short' ? 'coffee' : 'moon'} size={40} stroke={1.6} />
      </div>
      <p class="about">{t(kind === 'short' ? 'rest.shortAbout' : 'rest.longAbout')}</p>

      {#if kind === 'short'}
        <section class="hd">
          <div class="hd-info">
            <span class="hd-t">{t('combat.hitDice')} · {die}</span>
            <span class="hd-s">{left}/{c.hitDice.total} · {t('rest.hpNow', { cur: c.hp.current, max: c.hp.max })}</span>
          </div>
          <button class="btn btn-outline" disabled={left <= 0 || !!pendingHeal} onclick={spendHitDie}>
            <Icon name="dice" size={18} />{t('rest.roll', { f: formula.replace('-', '−') })}
          </button>
        </section>
      {/if}

      <section class="prev">
        <h3 class="pt">{t('rest.restores')}</h3>
        {#if rows.length}
          <ul>
            {#each rows as r, i (i)}
              <li><span class="pn">{r.name}</span><b class="num">{r.value}</b></li>
            {/each}
          </ul>
        {:else}
          <div class="none">{t('combat.restNothing')}</div>
        {/if}
      </section>

      <div class="sp"></div>
      <button class="btn btn-primary go" onclick={rest}>
        <Icon name={kind === 'short' ? 'coffee' : 'moon'} size={20} />{t('rest.go')}
      </button>
    {/if}
  </Tray>
{/if}

<style>
  .kind {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-top: 2px;
  }
  .kind :global(.seg) {
    width: 100%;
  }
  .scene {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 76px;
    height: 76px;
    margin-top: 4px;
    border-radius: 50%;
    color: #ffc58e;
    background: radial-gradient(circle at 50% 70%, rgba(232, 116, 59, 0.45), rgba(232, 116, 59, 0.08) 60%, transparent 72%);
    position: relative;
    filter: drop-shadow(0 0 10px rgba(232, 116, 59, 0.45));
  }
  /* мерцание костра — прозрачностью отдельного слоя (дёшево), а не анимацией filter */
  .scene:not(.long)::after {
    content: '';
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    background: radial-gradient(circle at 50% 70%, rgba(255, 150, 70, 0.35), transparent 65%);
    animation: flicker 2.4s ease-in-out infinite;
    pointer-events: none;
  }
  .scene.long {
    color: #cfd8ff;
    background: radial-gradient(circle at 50% 50%, rgba(140, 160, 255, 0.3), rgba(140, 160, 255, 0.06) 60%, transparent 72%);
    filter: drop-shadow(0 0 10px rgba(140, 160, 255, 0.35));
    animation: none;
  }
  .about {
    margin: 0;
    text-align: center;
    font-size: 13.5px;
    line-height: 1.45;
    color: #cdb898;
    max-width: 340px;
  }
  .hd {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.25);
    box-shadow: inset 0 0 0 1px rgba(214, 170, 110, 0.18);
  }
  .hd-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .hd-t {
    font-family: var(--font-sc);
    font-weight: 700;
    color: var(--parch);
  }
  .hd-s {
    font-size: 12.5px;
    color: var(--muted);
  }
  .prev {
    width: 100%;
  }
  .pt {
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--gold);
    opacity: 0.85;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 6px 2px;
    border-bottom: 1px dashed rgba(214, 170, 110, 0.18);
    font-size: 14px;
    color: var(--parch);
  }
  li:last-child {
    border-bottom: none;
  }
  .pn {
    flex: 1;
    min-width: 0;
  }
  li b {
    color: #ffc58e;
  }
  .none {
    font-size: 13px;
    color: var(--muted);
  }
  .sp {
    flex: 1;
  }
  .go {
    width: 100%;
    min-height: 54px;
    flex-shrink: 0;
  }
  @keyframes flicker {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }
</style>
