<script lang="ts">
  /** Шапка листа: портрет, имя, класс/раса, полоса опыта, шестиугольник, чипы. В режиме правки — форма. */
  import Portrait from '../../components/Portrait.svelte';
  import Icon from '../../components/Icon.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import TextField from '../../components/TextField.svelte';
  import Radar from './Radar.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { journal } from '../../lib/stores/journal.svelte';
  import { ui, buzz } from '../../lib/stores/ui.svelte';
  import { fmt, profBonusForLevel } from '../../lib/rules/calc';
  import { todayDate } from '../../lib/model/ids';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  const meta = $derived(
    [[c.className, c.level ? String(c.level) : ''].filter(Boolean).join(' '), c.race, c.background, c.alignment]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' · '),
  );

  const nf = new Intl.NumberFormat('uk-UA');
  const xpPct = $derived(c.xpNext > 0 ? Math.min(100, Math.max(0, (c.xp / c.xpNext) * 100)) : 0);
  const xpText = $derived(
    c.level < 20
      ? t('sheet.xp', { xp: nf.format(c.xp), next: nf.format(c.xpNext), lvl: c.level + 1 })
      : t('sheet.xpPlain', { xp: nf.format(c.xp), next: nf.format(c.xpNext) }),
  );

  /** Последняя сессия журнала — «СЕСІЯ 7 · СУБОТА, 21 ЛИСТОПАДА». */
  const kicker = $derived.by(() => {
    let best: { n: number; date: string } | null = null;
    for (const e of journal.entries) {
      if (e.kind !== 'session' || e.sessionNo == null) continue;
      if (!best || e.sessionNo > best.n) best = { n: e.sessionNo, date: e.date };
    }
    if (!best) return '';
    let when = '';
    if (best.date === todayDate()) when = t('sheet.today');
    else {
      const [y, m, d] = best.date.split('-').map(Number);
      if (y && m && d) when = new Date(y, m - 1, d).toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });
    }
    return [t('sheet.session', { n: best.n }), when].filter(Boolean).join(' · ');
  });

  function toggleInspiration() {
    c.inspiration = !c.inspiration;
    buzz(c.inspiration ? [15, 30, 15] : 10);
  }
</script>

{#if ui.editing}
  <section class="hdr-edit panel">
    <div class="who">
      <Portrait id={c.portraitId} name={c.name} size={72} />
      <div class="grow">
        <TextField label={t('sheet.f.name')} bind:value={c.name} serif />
      </div>
    </div>
    <div class="form">
      <div class="span2"><TextField label={t('sheet.f.class')} bind:value={c.className} /></div>
      <NumberField label={t('sheet.f.level')} bind:value={c.level} min={1} max={20} />
      <NumberField
        label={t('sheet.f.prof')}
        bind:value={c.profBonusOverride}
        nullable
        min={0}
        max={20}
        placeholder={t('sheet.profAutoPh', { v: fmt(profBonusForLevel(c.level)) })}
      />
      <div class="span2"><TextField label={t('sheet.f.race')} bind:value={c.race} /></div>
      <div class="span2"><TextField label={t('sheet.f.background')} bind:value={c.background} /></div>
      <div class="span2"><TextField label={t('sheet.f.alignment')} bind:value={c.alignment} /></div>
      <div class="span2"><TextField label={t('sheet.f.player')} bind:value={c.playerName} /></div>
      <NumberField label={t('sheet.f.xp')} bind:value={c.xp} min={0} />
      <NumberField label={t('sheet.f.xpNext')} bind:value={c.xpNext} min={0} placeholder="0" />
    </div>
    <p class="muted hint">{t('sheet.f.xpNextHint')}</p>
  </section>
{:else}
  <section class="hdr">
    <Portrait id={c.portraitId} name={c.name} size={72} />
    <div class="id">
      {#if kicker}<div class="greet">{kicker}</div>{/if}
      <h2 class="nm serif">{c.name || t('sheet.unnamed')}</h2>
      {#if meta}<div class="meta">{meta}</div>{/if}
      {#if c.xpNext > 0}
        <div class="xp">
          <div class="bar"><div style:width="{xpPct}%"></div></div>
          <span>{xpText}</span>
        </div>
      {/if}
    </div>
    <div class="right">
      <Radar scores={c.abilities} />
      <div class="chips">
        <button class="chip" class:on={c.inspiration} aria-pressed={c.inspiration} onclick={toggleInspiration}>
          <Icon name="sparkle" size={18} fill={c.inspiration} />{t('sheet.inspiration')}
        </button>
        <button class="chip" class:on={c.rules.rerollOnes} aria-pressed={c.rules.rerollOnes} onclick={() => (c.rules.rerollOnes = !c.rules.rerollOnes)}>
          <Icon name="reroll" size={18} />{t('sheet.rerollOnes')}
        </button>
      </div>
    </div>
  </section>
{/if}

<style>
  .hdr {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .id {
    flex: 1 1 260px;
    min-width: 0;
  }
  .greet {
    font-size: 12px;
    letter-spacing: 0.12em;
    color: var(--muted);
    font-weight: 600;
    text-transform: uppercase;
  }
  .nm {
    font-size: 36px;
    color: var(--parch);
    line-height: 1.05;
    overflow-wrap: anywhere;
  }
  .meta {
    color: var(--muted);
    font-size: 14px;
  }
  .xp {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 6px;
    flex-wrap: wrap;
  }
  .bar {
    width: min(260px, 100%);
    height: 6px;
    border-radius: 3px;
    background: var(--line);
    overflow: hidden;
  }
  .bar div {
    height: 100%;
    background: linear-gradient(90deg, var(--ember), var(--gold));
  }
  .xp span {
    font-size: 12px;
    color: var(--muted);
  }
  .right {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-left: auto;
    flex-wrap: wrap;
  }
  .chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .chips .chip {
    min-height: var(--tap);
    padding: 0 16px;
    border-radius: 24px;
  }
  .chip.on :global(svg) {
    filter: drop-shadow(0 0 4px var(--ember-glow));
  }

  .hdr-edit {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .who {
    display: flex;
    align-items: flex-end;
    gap: 14px;
  }
  .who :global(input) {
    font-size: 24px;
    font-weight: 700;
  }
  .form {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px 12px;
  }
  .span2 {
    grid-column: span 2;
  }
  @container (max-width: 620px) {
    .form {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .hint {
    margin: 0;
    font-size: 12.5px;
  }
</style>
