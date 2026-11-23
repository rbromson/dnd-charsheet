<script lang="ts">
  /** Бібліотека заклинань SRD 5.1: пошук, рівень, клас; додавання в книгу заклинань і (для шкоди) в атаки. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import Icon from '../../components/Icon.svelte';
  import { loadSpells, matches } from '../../lib/library';
  import { spellAttack, spellDamageDice, spellFromLib } from '../../lib/library/apply';
  import type { LibSpell } from '../../lib/library/types';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { dieText, lang, t } from '../../lib/i18n';
  import { onMount } from 'svelte';
  import SpellSheet from './SpellSheet.svelte';

  const PAGE = 60;

  let all = $state<LibSpell[]>([]);
  let loading = $state(true);
  let q = $state('');
  let level = $state<number | null>(null);
  let cls = $state<string | null>(null);
  let limit = $state(PAGE);
  let sel = $state<LibSpell | null>(null);
  let body: HTMLElement | undefined = $state();

  onMount(async () => {
    all = await loadSpells();
    loading = false;
  });

  const list = $derived(
    all
      .filter((s) => (level === null || s.l === level) && (!cls || s.cl.includes(cls)) && matches(q, s.n, s.en))
      .sort((a, b) => a.l - b.l || a.n.localeCompare(b.n, 'uk')),
  );
  const shown = $derived(list.slice(0, limit));
  const CLASSES = $derived([...new Set(all.flatMap((s) => s.cl))].sort((a, b) => a.localeCompare(b)));
  const have = $derived(new Set(charStore.current?.spells.map((s) => s.name.trim().toLowerCase())));

  $effect(() => {
    void q;
    void level;
    void cls;
    limit = PAGE;
  });

  function open(s: LibSpell) {
    sel = s;
    body?.parentElement?.scrollTo({ top: 0 });
  }

  const lvl = (l: number) => (l === 0 ? t('lib.cantrip') : t('lib.level', { n: l }));

  function damageLine(s: LibSpell): string {
    const c = charStore.current;
    const d = spellDamageDice(s, c?.level ?? 1);
    if (!d) return '';
    return `${dieText(d)} ${s.dm?.t ?? ''}`.trim();
  }

  function add(s: LibSpell, asAttack: boolean) {
    const c = charStore.current;
    if (!c) return;
    c.spellcasting.enabled = true;
    // не добавляем сразу: заполненная карточка, «Скасувати» уберёт и заклинание, и атаку
    const sp = spellFromLib(s);
    c.spells.push(sp);
    let attackId: string | null = null;
    if (asAttack) {
      const a = spellAttack(c, s);
      if (a) {
        c.attacks.push(a);
        attackId = a.id;
      }
    }
    ui.openSheet(SpellSheet, { id: sp.id, fresh: true, attackId });
  }
</script>

<SheetFrame kicker={t('lib.kicker')} title={sel ? sel.n : t('lib.spellsTitle')}>
  <div class="wrap" bind:this={body}>
    {#if sel}
      {@const s = sel}
      <button class="back" onclick={() => (sel = null)}><Icon name="back" size={18} />{t('lib.back')}</button>
      <div class="meta">
        <span class="en">{s.en}</span>
        <span class="tag">{lvl(s.l)}</span>
        <span class="kind">{s.sc}{s.ri ? ` · ${t('lib.ritual')}` : ''}{s.co ? ` · ${t('lib.conc')}` : ''}</span>
      </div>
      <dl class="grid">
        <dt>{t('lib.castTime')}</dt><dd>{s.ct}</dd>
        <dt>{t('lib.rangeLbl')}</dt><dd>{s.rg}</dd>
        <dt>{t('lib.components')}</dt><dd>{s.cp}{s.mt ? ` (${s.mt})` : ''}</dd>
        <dt>{t('lib.duration')}</dt><dd>{s.co ? `${t('lib.conc')}, ` : ''}{s.du}</dd>
        {#if damageLine(s)}<dt>{t('lib.damage')}</dt><dd class="num">{damageLine(s)}{s.sv ? ` · ${t('lib.save', { a: t(`ability.${s.sv}`) })}` : s.at ? ` · ${t('lib.spellAtk')}` : ''}</dd>{/if}
        <dt>{t('lib.classes')}</dt><dd>{s.cl.join(', ') || '—'}</dd>
      </dl>
      <div class="text serif">{s.t}</div>
      {#if s.h}<div class="text serif higher"><b>{t('lib.higher')}</b> {s.h}</div>{/if}
    {:else}
      <label class="search">
        <Icon name="search" size={18} />
        <input class="field" type="search" placeholder={t('lib.searchSpells')} bind:value={q} enterkeyhint="search" />
      </label>
      <div class="cats">
        <button class="chip" class:on={level === null} onclick={() => (level = null)}>{t('lib.allLevels')}</button>
        {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as l (l)}
          <button class="chip lv" class:on={level === l} onclick={() => (level = level === l ? null : l)}>{l === 0 ? t('lib.cantripsShort') : l}</button>
        {/each}
      </div>
      <div class="cats">
        {#each CLASSES as k (k)}
          <button class="chip sm" class:on={cls === k} onclick={() => (cls = cls === k ? null : k)}>{k}</button>
        {/each}
      </div>
      {#if loading}
        <div class="empty">{t('lib.loading')}</div>
      {:else if !list.length}
        <div class="empty">{t('lib.nothing')}</div>
      {:else}
        <ul class="list">
          {#each shown as s (s.id)}
            <li>
              <button class="row-btn" onclick={() => open(s)}>
                <span class="lvn num">{s.l === 0 ? '∘' : s.l}</span>
                <span class="grow txt">
                  <span class="nm serif">
                    {s.n}{#if have.has(s.n.trim().toLowerCase())}<span class="own"><Icon name="check" size={13} stroke={2.4} /></span>{/if}
                  </span>
                  <span class="sb">{#if lang === 'uk'}<i>{s.en}</i> · {/if}{s.sc} · {s.ct} · {s.rg}{s.co ? ` · ${t('lib.concShort')}` : ''}</span>
                </span>
                {#if damageLine(s)}<span class="st num">{damageLine(s)}</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
        {#if list.length > limit}
          <button class="btn btn-outline more" onclick={() => (limit += PAGE)}>{t('lib.more', { n: list.length - limit })}</button>
        {/if}
      {/if}
      <p class="credit">{t('lib.credit')}</p>
    {/if}
  </div>

  {#snippet footer()}
    {#if sel}
      {#if charStore.current && spellAttack(charStore.current, sel)}
        <button class="btn btn-outline grow" onclick={() => add(sel!, true)}><Icon name="combat" size={18} />{t('lib.addSpellAtk')}</button>
      {/if}
      <button class="btn btn-ink grow" onclick={() => add(sel!, false)}><Icon name="plus" size={20} />{t('lib.addSpell')}</button>
    {:else}
      <button class="btn btn-outline grow" onclick={() => ui.closeSheet()}>{t('common.done')}</button>
    {/if}
  {/snippet}
</SheetFrame>

<style>
  .wrap {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .search {
    position: relative;
    display: block;
  }
  .search :global(svg) {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink2);
  }
  .search .field {
    padding-left: 38px;
  }
  .cats {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
  }
  .chip.lv {
    min-width: 40px;
    justify-content: center;
    padding: 0 8px;
  }
  .chip.sm {
    min-height: 36px;
    font-size: 13px;
    padding: 0 10px;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .row-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    min-height: 54px;
    padding: 6px 2px;
    border-bottom: 1px solid rgba(107, 90, 72, 0.18);
  }
  .row-btn:active {
    background: rgba(42, 31, 23, 0.06);
  }
  .lvn {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ink);
    color: var(--parch);
    font-size: 14px;
  }
  .txt {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .nm {
    font-weight: 700;
    font-size: 16.5px;
    line-height: 1.2;
  }
  .own {
    color: var(--good);
    margin-left: 6px;
  }
  .sb {
    font-size: 12.5px;
    color: var(--ink2);
  }
  .st {
    font-size: 13px;
    text-align: right;
    max-width: 38%;
  }
  .more {
    align-self: center;
  }
  .credit {
    font-size: 11px;
    color: var(--ink2);
    margin: 8px 0 0;
  }
  .back {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
    color: var(--ink2);
    font-weight: 600;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }
  .en {
    font-size: 13px;
    color: var(--ink2);
    font-style: italic;
  }
  .kind {
    font-size: 13px;
    color: var(--ink2);
  }
  .grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 14px;
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(42, 31, 23, 0.07);
    box-shadow: inset 0 0 0 1px rgba(150, 112, 62, 0.3);
    font-size: 14px;
  }
  dt {
    color: var(--ink2);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding-top: 2px;
  }
  dd {
    margin: 0;
  }
  .text {
    white-space: pre-wrap;
    font-size: 16px;
    line-height: 1.5;
  }
</style>
