<script lang="ts">
  /**
   * Оверлей результата броска: кость кувыркается ~0,7 с, затем крупный итог и мелкий расклад.
   * Нат. 20 — золотая вспышка и «КРИТ», нат. 1 — красная и «ПРОВАЛ».
   * Анимация перезапускается на каждый dice.seq; докинутая кость ресурса анимируется отдельно.
   * embedded — тот же результат прямо внутри лотка кубиков (без второго окна поверх);
   * пока лоток открыт, отдельное окно молчит.
   */
  import { untrack } from 'svelte';
  import DieShape from './DieShape.svelte';
  import Dice3D, { can3d, type DieSpec } from './Dice3D.svelte';
  import { dice, type RollEntry } from '../../lib/stores/dice.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { buzz, ui } from '../../lib/stores/ui.svelte';
  import { parseFormula, formatFormula } from '../../lib/dice/formula';
  import { fmt } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';
  import { joinParts, d20Parts, formulaParts, ruleChips, groupDice, MINUS, type RuleChip } from './format';

  type Phase = 'idle' | 'spin' | 'add';

  let { embedded = false }: { embedded?: boolean } = $props();
  /** Этот экземпляр показывает броски: встроенный — всегда, отдельное окно — только когда не открыт ни один лоток. */
  const active = $derived(embedded || !(ui.diceTrayOpen || ui.restOpen));

  const SPIN_MS = 720;
  const ADD_MS = 480;

  let phase = $state<Phase>('idle');
  /** Случайные грани на время кувыркания (основные кости) */
  let rand = $state<number[]>([]);
  /** Случайные грани новых докинутых костей */
  let randExtra = $state<number[]>([]);
  /** Индекс первой новой докинутой кости (пока она катится) */
  let addFrom = $state(-1);
  let spinKey = $state(0);
  let addKey = $state(0);
  let popKey = $state(0);
  let flashKey = $state(0);

  /** Что уже показано — чтобы отличить новый бросок от докинутой кости и от просмотра истории. */
  const track = untrack(() => ({
    id: dice.last?.id ?? '',
    extra: dice.last?.type === 'd20' ? dice.last.roll.extra.length : 0,
    seq: dice.seq,
  }));

  const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (s: number) => 1 + Math.floor(Math.random() * s);

  /** Кости броска для 3D (без докинутых костей ресурсов). */
  function specsOf(e: RollEntry): DieSpec[] {
    if (e.type === 'd20') return e.roll.dice.map((d) => ({ sides: 20, value: d.value }));
    return e.roll.dice.map((d) => ({ sides: d.sides, value: d.value }));
  }
  /** Закончить кувыркание (3D сообщает о приземлении сам). */
  let finishSpin: (() => void) | null = null;
  function landed3d() {
    finishSpin?.();
  }

  function mainSides(e: RollEntry): number[] {
    return e.type === 'd20' ? e.roll.dice.map(() => 20) : e.roll.dice.map((d) => d.sides);
  }

  function start(e: RollEntry | null, seq: number): (() => void) | void {
    if (!e) {
      phase = 'idle';
      return;
    }
    const fresh = seq !== track.seq;
    const extraLen = e.type === 'd20' ? e.roll.extra.length : 0;
    const isAdd = fresh && e.id === track.id && extraLen > track.extra;
    const from = track.extra;
    track.id = e.id;
    track.extra = extraLen;
    track.seq = seq;

    if (!fresh || reducedMotion()) {
      phase = 'idle';
      addFrom = -1;
      if (fresh) popKey++;
      return;
    }

    // основной бросок в 3D: ждём приземления (с запасным таймером)
    if (!isAdd && can3d(specsOf(e))) {
      addFrom = -1;
      phase = 'spin';
      spinKey++;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        finishSpin = null;
        phase = 'idle';
        popKey++;
        if (e.type === 'd20' && (e.roll.crit || e.roll.fumble)) flashKey++;
        else buzz(8);
      };
      finishSpin = finish;
      const to3d = setTimeout(finish, 4000);
      return () => {
        clearTimeout(to3d);
        finishSpin = null;
      };
    }

    const sides = isAdd && e.type === 'd20' ? e.roll.extra.slice(from).map((x) => x.sides) : mainSides(e);
    const shuffle = () => {
      const v = sides.map(rnd);
      if (isAdd) randExtra = v;
      else rand = v;
    };
    shuffle();
    addFrom = isAdd ? from : -1;
    phase = isAdd ? 'add' : 'spin';
    if (isAdd) addKey++;
    else spinKey++;

    const iv = setInterval(shuffle, 70);
    const to = setTimeout(
      () => {
        clearInterval(iv);
        phase = 'idle';
        addFrom = -1;
        popKey++;
        if (!isAdd && e.type === 'd20' && (e.roll.crit || e.roll.fumble)) flashKey++;
        else buzz(8);
      },
      isAdd ? ADD_MS : SPIN_MS,
    );
    return () => {
      clearInterval(iv);
      clearTimeout(to);
    };
  }

  $effect(() => {
    const e = dice.last;
    const seq = dice.seq;
    const on = active;
    return untrack(() => {
      if (on) return start(e, seq);
      // бросок показывает другой экземпляр — только запомнить, что он уже был
      track.id = e?.id ?? '';
      track.extra = e?.type === 'd20' ? e.roll.extra.length : 0;
      track.seq = seq;
      phase = 'idle';
    });
  });

  const entry = $derived(dice.overlayOpen && active ? dice.last : null);
  const landed = $derived(phase === 'idle');

  /** Бросок d20 «как видно сейчас»: пока новая кость катится — без неё. */
  const shown = $derived.by(() => {
    if (entry?.type !== 'd20') return null;
    const r = entry.roll;
    if (phase !== 'add' || addFrom < 0) return r;
    const pending = r.extra.slice(addFrom).reduce((s, x) => s + x.value, 0);
    return { ...r, extra: r.extra.slice(0, addFrom), total: r.total - pending };
  });

  const crit = $derived(landed && entry?.type === 'd20' && entry.roll.crit);
  const fumble = $derived(landed && entry?.type === 'd20' && entry.roll.fumble && !entry.roll.crit);
  const flashTone = $derived(entry?.type === 'd20' ? (entry.roll.crit ? 'gold' : entry.roll.fumble ? 'bad' : '') : '');

  const total = $derived(entry ? (shown ? shown.total : entry.roll.total) : 0);
  const totalText = $derived(total < 0 ? MINUS + Math.abs(total) : String(total));

  const subtitle = $derived.by(() => {
    if (!entry) return '';
    if (entry.type === 'd20') {
      const bits: string[] = [];
      if (entry.roll.mode === 'adv') bits.push(t('roll.adv'));
      if (entry.roll.mode === 'dis') bits.push(t('roll.dis'));
      bits.push(t('dice.bonus', { n: fmt(entry.roll.bonus) }));
      return bits.join(' · ');
    }
    const f = pretty(entry.roll.formula);
    return f.replace(/\s+/g, '') === entry.label.replace(/\s+/g, '') ? '' : f;
  });

  const breakdown = $derived.by(() => {
    if (!entry) return '';
    if (shown) return joinParts(d20Parts(shown, t('dice.bonusWord')), shown.total);
    if (entry.type === 'formula') return joinParts(formulaParts(entry.roll), entry.roll.total);
    return '';
  });

  const chips = $derived(shown ? ruleChips(shown) : []);

  function chipText(c: RuleChip): string {
    if (c.kind === 'reroll') return t('dice.rule.reroll', { from: c.from, to: c.to });
    if (c.kind === 'min') return t('dice.rule.min', { from: c.from, to: c.to });
    return t('dice.rule.extra', { sides: c.sides, label: c.label, value: c.value });
  }

  function pretty(f: string): string {
    return f.replace(/-/g, MINUS);
  }

  /** Размер костей в зависимости от их количества. */
  function sizeFor(n: number): number {
    if (n <= 1) return 120;
    if (n <= 2) return 96;
    if (n <= 4) return 72;
    if (n <= 8) return 54;
    return 40;
  }

  /** Ресурсы с костью: кнопка «докинуть», пока можно; после лимита — пометка «використано N/M». */
  const resRows = $derived.by(() => {
    if (entry?.type !== 'd20' || entry.request.kind === 'death') return [];
    return (charStore.current?.resources ?? [])
      .filter((r) => r.die)
      .map((r) => {
        const spent = dice.spentOnLast(r.id);
        const used =
          spent > 0
            ? r.maxPerRoll != null
              ? t('dice.resourceUsed', { n: spent, max: r.maxPerRoll })
              : t('dice.resourceUsedNoMax', { n: spent })
            : '';
        return { r, can: dice.canAddResourceDie(r.id), used };
      })
      .filter((x) => x.can || x.used);
  });

  const damage = $derived(
    entry?.type === 'd20' && entry.request.kind === 'attack' && entry.request.damage ? entry.request.damage : null,
  );
  const damageCrit = $derived(entry?.type === 'd20' && entry.roll.crit);
  const damagePreview = $derived(damage ? pretty(formatFormula(parseFormula(damage), damageCrit)) : '');

  function rollDamage() {
    if (entry?.type !== 'd20' || !damage) return;
    dice.rollDamage(entry.request.damageLabel ?? entry.label, damage, damageCrit);
  }

  function again() {
    const e = dice.last;
    if (!e) return;
    if (e.type === 'd20') {
      dice.mode = e.roll.mode;
      dice.rollCheck({ ...e.request });
    } else {
      dice.rollDamage(e.label, e.roll.formula, e.roll.crit);
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && entry) dice.close();
  }
</script>

<svelte:window onkeydown={onKey} />

{#if entry && embedded}
  {#if flashKey && flashTone}
    {#key flashKey}
      <div class="flash flash-{flashTone}" aria-hidden="true"></div>
    {/key}
  {/if}
  {@render card(entry)}
{:else if entry}
  <div class="layer">
    <button class="scrim" aria-label={t('dice.close')} onclick={() => dice.close()}></button>

    {#if flashKey && flashTone}
      {#key flashKey}
        <div class="flash flash-{flashTone}" aria-hidden="true"></div>
      {/key}
    {/if}

    {@render card(entry)}
  </div>
{/if}

{#snippet card(entry: RollEntry)}
    <div class="rc" class:embedded class:crit class:fumble role={embedded ? 'region' : 'dialog'} aria-modal={embedded ? undefined : 'true'} aria-label={entry.label}>
      <div class="tt">{entry.label}</div>
      {#if subtitle}<div class="su">{subtitle}</div>{/if}

      <!-- Кости -->
      {#if entry.type === 'd20'}
        {@const r = entry.roll}
        <div class="dice-row">
          {#if can3d(specsOf(entry))}
            <div class="d3wrap">
              <Dice3D
                specs={r.dice.map((d) => ({
                  sides: 20,
                  value: d.value,
                  tone: phase === 'spin' ? 'ember' : r.dice.length > 1 && !d.kept ? 'dim' : crit ? 'gold' : fumble ? 'bad' : 'ember',
                  struck: phase !== 'spin' && r.dice.length > 1 && !d.kept,
                }))}
                rollKey={spinKey}
                mode={phase === 'spin' ? 'roll' : 'show'}
                height={embedded ? 130 : r.dice.length > 1 ? 150 : 170}
                onlanded={landed3d}
              />
            </div>
          {:else}
          {#key spinKey}
            {#each r.dice as d, i (i)}
              <DieShape
                sides={20}
                value={phase === 'spin' ? (rand[i] ?? '') : d.value}
                size={r.dice.length > 1 ? 104 : 124}
                tone={phase === 'spin' ? 'ember' : r.dice.length > 1 && !d.kept ? 'dim' : crit ? 'gold' : fumble ? 'bad' : 'ember'}
                spinning={phase === 'spin'}
                struck={phase !== 'spin' && r.dice.length > 1 && !d.kept}
                dir={i % 2 ? -1 : 1}
              />
            {/each}
          {/key}
          {/if}
          {#if r.extra.length}
            <span class="plus">+</span>
            <div class="extras">
              {#each r.extra as x, i (i)}
                {@const rolling = phase === 'add' && addFrom >= 0 && i >= addFrom}
                {#if rolling}
                  {#key addKey}
                    <DieShape sides={x.sides} value={randExtra[i - addFrom] ?? ''} size={52} spinning dir={-1} />
                  {/key}
                {:else}
                  <DieShape sides={x.sides} value={x.value} size={52} tone={phase === 'spin' ? 'plain' : 'ember'} />
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        {@const r = entry.roll}
        {@const groups = groupDice(r)}
        {@const sz = sizeFor(r.dice.length)}
        {#if can3d(specsOf(entry))}
          <div class="dice-row">
            <div class="d3wrap">
              <Dice3D specs={specsOf(entry)} rollKey={spinKey} mode={phase === 'spin' ? 'roll' : 'show'} height={embedded ? 130 : r.dice.length > 3 ? 140 : 160} onlanded={landed3d} />
            </div>
            {#if r.flat}
              <span class="plus">{r.flat < 0 ? MINUS : '+'}</span>
              <span class="flat num">{Math.abs(r.flat)}</span>
            {/if}
          </div>
        {:else}
        <div class="dice-row formula" class:many={r.dice.length > 4}>
          {#key spinKey}
            {#each groups as g, gi (gi)}
              {@const offset = groups.slice(0, gi).reduce((s, x) => s + x.values.length, 0)}
              {#if gi > 0 || g.sign < 0}<span class="plus">{g.sign < 0 ? MINUS : '+'}</span>{/if}
              <div class="group">
                {#each g.values as v, vi (vi)}
                  {@const k = offset + vi}
                  <DieShape
                    sides={g.sides}
                    value={phase === 'spin' ? (rand[k] ?? '') : v}
                    size={sz}
                    tone={phase !== 'spin' && g.sides === 20 && v === 20 ? 'gold' : phase !== 'spin' && g.sides === 20 && v === 1 ? 'bad' : 'ember'}
                    spinning={phase === 'spin'}
                    label={sz >= 54 && r.dice.length > 1}
                    dir={k % 2 ? -1 : 1}
                  />
                {/each}
              </div>
            {/each}
            {#if r.flat}
              <span class="plus">{r.flat < 0 ? MINUS : '+'}</span>
              <span class="flat num">{Math.abs(r.flat)}</span>
            {/if}
          {/key}
        </div>
        {/if}
      {/if}

      <!-- Итог -->
      <div class="tot-wrap" class:hidden={phase === 'spin'}>
        {#key popKey}
          <div class="tot num" class:bump={phase === 'idle'}>{totalText}</div>
        {/key}
      </div>

      <div class="after" class:hidden={phase === 'spin'}>
        {#if crit}<div class="plate plate-gold">{t('dice.crit')}</div>{/if}
        {#if fumble}<div class="plate plate-bad">{t('dice.fumble')}</div>{/if}
        {#if breakdown}<div class="bd num">{breakdown}</div>{/if}
        {#if chips.length || (entry.type === 'formula' && entry.roll.crit)}
          <div class="chips">
            {#if entry.type === 'formula' && entry.roll.crit}<span class="rule">{t('dice.critDice')}</span>{/if}
            {#each chips as c, i (i)}
              <span class="rule" class:off={!c.kept}>{chipText(c)}</span>
            {/each}
          </div>
        {/if}
      </div>

      {#if landed}
        <span class="sr" aria-live="polite">{t('dice.result', { n: totalText })}</span>
      {/if}

      <!-- Ресурсы: докинуть кость -->
      {#if resRows.length}
        <div class="res">
          {#each resRows as { r, can, used } (r.id)}
            {#if can}
              <button class="act res-btn" disabled={!landed} onclick={() => dice.addResourceDie(r.id)}>
                <span class="res-main">{t('dice.addResource', { die: r.die ?? '', name: r.name })}</span>
                <span class="res-sub">{t('dice.resourceLeft', { n: r.current })}{used ? ' · ' + used : ''}</span>
              </button>
            {:else}
              <div class="res-note">{r.name}: {used}</div>
            {/if}
          {/each}
        </div>
      {/if}

      <div class="acts">
        {#if damage}
          <button class="act pri" class:gold={damageCrit} disabled={!landed} onclick={rollDamage}>
            <span>{damageCrit ? t('dice.damageCrit') : t('dice.damage')}</span>
            <span class="pv num">{damagePreview}</span>
          </button>
        {/if}
        {#if !(entry.type === 'd20' && entry.request.kind === 'death') && !(entry.type === 'formula' && entry.once)}
          <button class="act sec" onclick={again}>{t('dice.again')}</button>
        {/if}
        <button class="act sec done" onclick={() => dice.close()}>{t('dice.done')}</button>
      </div>
    </div>
{/snippet}

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
    pointer-events: auto;
    cursor: default;
    animation: fade 0.18s ease-out both;
  }
  .rc {
    pointer-events: auto;
    position: relative;
    width: min(460px, 100%);
    max-height: calc(100dvh - 32px);
    overflow-x: hidden;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--leather);
    background-size: var(--leather-size);
    border: 1px solid #0a0605;
    border-radius: 24px;
    padding: 22px 22px 20px;
    color: var(--parch);
    text-align: center;
    box-shadow:
      var(--leather-shadow),
      0 0 70px var(--ember-glow),
      0 20px 50px rgba(0, 0, 0, 0.55);
    animation: card-in 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
    transition:
      border-color 0.3s,
      box-shadow 0.3s;
  }
  /* внутри лотка: без своей «карточки», лоток и есть окно */
  .rc.embedded {
    width: 100%;
    max-height: none;
    /* всплывающий итог на миг больше — не даём ему вызвать прокрутку лотка */
    overflow: clip;
    background: none;
    border: none;
    border-radius: 0;
    box-shadow: none;
    padding: 2px 2px 4px;
    animation: card-in 0.2s var(--ease) both;
  }
  .rc.embedded.crit,
  .rc.embedded.fumble {
    box-shadow: none;
  }
  .rc.embedded::before {
    inset: 0;
  }
  .rc.embedded .dice-row {
    margin: 8px 0 2px;
    min-height: 0;
  }
  .rc > :not(.sr) {
    position: relative;
  }
  .rc::before {
    content: '';
    position: absolute;
    inset: -40%;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.4s;
  }
  .rc.crit {
    border-color: #6b5228;
    box-shadow:
      0 0 90px var(--gold-glow),
      0 0 0 1px rgba(230, 180, 80, 0.3),
      0 20px 50px rgba(0, 0, 0, 0.55);
  }
  .rc.crit::before {
    opacity: 1;
    background: conic-gradient(from 0deg, transparent, rgba(230, 180, 80, 0.2), transparent 30%);
    animation: spin 6s linear infinite;
  }
  .rc.fumble {
    border-color: #5e2a22;
    box-shadow:
      0 0 70px rgba(192, 83, 63, 0.35),
      0 20px 50px rgba(0, 0, 0, 0.55);
  }
  .rc.fumble::before {
    opacity: 1;
    background: radial-gradient(circle at 50% 45%, rgba(192, 83, 63, 0.16), transparent 45%);
  }

  .tt {
    font-family: var(--font-sc);
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }
  .su {
    font-size: 13px;
    color: var(--muted);
    margin-top: 2px;
  }

  .dice-row {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 14px;
    margin: 16px 0 6px;
    min-height: 124px;
  }
  .d3wrap {
    flex: 1 1 100%;
    min-width: 0;
  }
  .dice-row.formula {
    gap: 8px 10px;
  }
  .dice-row.formula.many {
    min-height: 0;
  }
  .group,
  .extras {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .formula .group {
    padding-bottom: 14px; /* место под подпись dN */
  }
  .plus {
    font-family: var(--font-serif);
    font-size: 26px;
    font-weight: 700;
    color: var(--muted);
  }
  .flat {
    font-size: 30px;
    color: var(--parch);
  }

  .tot-wrap,
  .after {
    transition: opacity 0.15s;
  }
  .hidden {
    opacity: 0;
  }
  .tot {
    font-size: 84px;
    line-height: 1;
    color: var(--ember);
    text-shadow: 0 0 30px var(--ember-glow);
    font-family: var(--font-serif);
  }
  .tot.bump {
    animation: pop 0.38s cubic-bezier(0.2, 0.9, 0.3, 1.4) both;
  }
  .crit .tot {
    color: var(--gold);
    text-shadow: 0 0 34px var(--gold-glow);
  }
  .fumble .tot {
    color: var(--bad);
    text-shadow: 0 0 26px rgba(192, 83, 63, 0.45);
  }
  .plate {
    display: inline-block;
    font-family: var(--font-sc);
    font-weight: 700;
    letter-spacing: 0.14em;
    border-radius: 10px;
    padding: 4px 12px;
    margin-top: 8px;
    animation: pop 0.4s 0.08s cubic-bezier(0.2, 0.9, 0.3, 1.4) both;
  }
  .plate-gold {
    color: #1a1206;
    background: var(--gold);
  }
  .plate-bad {
    color: #fbe3dc;
    background: var(--bad);
  }
  .bd {
    font-size: 14px;
    font-weight: 500;
    color: #cdb898;
    margin-top: 8px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
    margin-top: 8px;
  }
  .rule {
    font-size: 11.5px;
    font-weight: 700;
    background: #3a2a1f;
    color: var(--ember);
    border-radius: 8px;
    padding: 3px 8px;
  }
  .rule.off {
    opacity: 0.45;
  }

  .res {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }
  .res-note {
    font-size: 12.5px;
    color: var(--muted);
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 12px;
  }
  .res + .acts {
    margin-top: 8px;
  }
  .act {
    position: relative;
    isolation: isolate;
    flex: 1 1 0;
    min-height: 52px;
    border-radius: 2px;
    clip-path: polygon(7px 0, calc(100% - 7px) 0, 100% 7px, 100% calc(100% - 7px), calc(100% - 7px) 100%, 7px 100%, 0 calc(100% - 7px), 0 7px);
    padding: 6px 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14.5px;
    line-height: 1.2;
    user-select: none;
    transition:
      transform 0.08s,
      opacity 0.15s;
  }
  .act:active {
    transform: scale(0.97);
  }
  .act:disabled {
    opacity: 0.45;
  }
  .act.pri {
    background: radial-gradient(ellipse 120% 90% at 50% 0%, #f39a5c 0%, #d2622c 40%, #8f3412 100%);
    color: #fff3e0;
    text-shadow: 0 1px 0 rgba(70, 18, 0, 0.7);
    outline: 1.5px solid #e3bd73;
    outline-offset: -1.5px;
    box-shadow: inset 0 1px 0 rgba(255, 225, 200, 0.6), inset 0 -3px 0 rgba(110, 35, 8, 0.3);
    /* главное действие — отдельной строкой во всю ширину, под ним равная пара */
    flex-basis: 100%;
    min-height: 56px;
  }
  .act.pri.gold {
    background: linear-gradient(180deg, #ffe39a, var(--gold) 50%, #b8861e);
    color: #1a1206;
  }
  .act {
    font-family: var(--font-sc);
    font-weight: 700;
    letter-spacing: 0.03em;
  }
  .act.sec,
  .res-btn {
    color: #f0dcb6;
    background: var(--frame-gold);
  }
  .act.sec::before,
  .res-btn::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    z-index: -1;
    clip-path: polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px);
    background: radial-gradient(ellipse 120% 100% at 50% 0%, #46342a, #1d140f);
  }
  .pv {
    font-size: 12.5px;
    opacity: 0.75;
  }
  .res-btn {
    width: 100%;
    color: var(--ember);
    background: var(--ember);
  }
  .res-btn::before {
    background: linear-gradient(180deg, #3a2318, #24150f);
  }
  .res-main {
    font-size: 15px;
  }
  .res-sub {
    font-size: 12px;
    font-weight: 500;
    color: #cdb898;
  }

  .flash {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 140vmax;
    height: 140vmax;
    margin: -70vmax 0 0 -70vmax;
    border-radius: 50%;
    pointer-events: none;
    animation: flash 0.9s ease-out both;
  }
  .flash-gold {
    background: radial-gradient(circle, rgba(255, 214, 120, 0.75), rgba(230, 180, 80, 0.25) 22%, transparent 45%);
  }
  .flash-bad {
    background: radial-gradient(circle, rgba(220, 90, 70, 0.6), rgba(192, 83, 63, 0.2) 22%, transparent 45%);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @keyframes spin {
    to {
      transform: rotate(1turn);
    }
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(12px) scale(0.94);
    }
  }
  @keyframes pop {
    0% {
      opacity: 0;
      transform: scale(0.4);
    }
    60% {
      opacity: 1;
      transform: scale(1.12);
    }
    100% {
      transform: none;
    }
  }
  @keyframes flash {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    18% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: scale(1.3);
    }
  }
</style>
