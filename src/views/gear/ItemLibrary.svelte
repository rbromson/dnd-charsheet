<script lang="ts">
  /** Бібліотека предметів SRD 5.1: пошук, категорії, опис, додавання до спорядження (з вибором основи для «Зброя +1» тощо). */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import Icon from '../../components/Icon.svelte';
  import { loadItems, matches, rarityText } from '../../lib/library';
  import { addLibItem, fitsPick } from '../../lib/library/apply';
  import type { LibItem } from '../../lib/library/types';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { dieText, lang, t } from '../../lib/i18n';
  import { onMount } from 'svelte';

  type Cat = 'all' | 'weapon' | 'armor' | 'gear' | 'magic';
  const CATS: Cat[] = ['all', 'weapon', 'armor', 'gear', 'magic'];
  const PAGE = 60;

  let all = $state<LibItem[]>([]);
  let loading = $state(true);
  let q = $state('');
  let cat = $state<Cat>('all');
  let limit = $state(PAGE);
  let sel = $state<LibItem | null>(null);
  let body: HTMLElement | undefined = $state();

  onMount(async () => {
    all = await loadItems();
    loading = false;
  });

  const list = $derived(
    all.filter(
      (e) =>
        !e.par &&
        (cat === 'all' || (cat === 'gear' ? e.c === 'gear' || e.c === 'tool' : e.c === cat)) &&
        matches(q, e.n, e.en),
    ),
  );
  const shown = $derived(list.slice(0, limit));
  const owned = $derived(new Set(charStore.current?.equipment.map((i) => i.ref).filter(Boolean)));
  const bases = $derived(sel?.x?.pick ? all.filter((b) => b.c !== 'magic' && fitsPick(sel!.x!.pick!, b)) : []);

  $effect(() => {
    void q;
    void cat;
    limit = PAGE;
  });

  function open(e: LibItem) {
    sel = e;
    body?.parentElement?.scrollTo({ top: 0 });
  }

  function stats(e: LibItem): string {
    const bits: string[] = [];
    if (e.w) bits.push(`${dieText(e.w.d)} ${e.w.dt}`.trim());
    if (e.ar)
      bits.push(
        e.ar.k === 'shield'
          ? t('lib.st.acPlus', { n: e.ar.b })
          : t('lib.st.ac', { n: e.ar.b }) + (e.ar.dx === undefined ? t('lib.st.dex') : e.ar.dx ? t('lib.st.dexMax', { n: e.ar.dx }) : ''),
      );
    if (e.x?.b) bits.push(`+${e.x.b}`);
    if (e.x?.ac) bits.push(t('lib.st.acPlus', { n: e.x.ac }));
    if (e.x?.sv) bits.push(t('lib.st.saves', { n: e.x.sv }));
    if (e.x?.set) bits.push(`${t(`abilityShort.${e.x.set[0]}`)} ${e.x.set[1]}`);
    if (e.x?.ch) bits.push(t('lib.charges', { n: e.x.ch }));
    return bits.join(' · ');
  }

  function sub(e: LibItem): string {
    if (e.c === 'magic') return [rarityText(e.r), e.a ? t('lib.attune') : ''].filter(Boolean).join(' · ');
    return [e.k, e.cost].filter(Boolean).join(' · ');
  }

  function add(e: LibItem, base?: LibItem) {
    const c = charStore.current;
    if (!c) return;
    const it = addLibItem(c, e, base);
    ui.toast(t('lib.added', { name: it.name }));
    sel = null;
  }
</script>

<SheetFrame kicker={t('lib.kicker')} title={sel ? sel.n : t('lib.itemsTitle')}>
  <div class="wrap" bind:this={body}>
    {#if sel}
      {@const e = sel}
      <button class="back" onclick={() => (sel = null)}><Icon name="back" size={18} />{t('lib.back')}</button>
      <div class="meta">
        <span class="en">{e.en}</span>
        <span class="kind">{e.k}</span>
        {#if e.r}<span class="tag rar rar-{e.r}">{rarityText(e.r)}</span>{/if}
        {#if e.a}<span class="tag att">{t('lib.attune')}</span>{/if}
      </div>
      {#if stats(e)}<div class="stats num">{stats(e)}</div>{/if}
      {#if e.w}
        <div class="facts">
          {#if e.w.p.length}<span>{e.w.p.join(', ')}</span>{/if}
          {#if e.w.v}<span>{t('lib.versatile', { d: dieText(e.w.v) })}</span>{/if}
          {#if e.w.rn}<span>{t('lib.range', { r: e.w.rn })}</span>{/if}
          <span>{e.w.m ? t('lib.martial') : t('lib.simple')}</span>
        </div>
      {/if}
      {#if e.ar && (e.ar.s || e.ar.sd)}
        <div class="facts">
          {#if e.ar.s}<span>{t('lib.strMin', { n: e.ar.s })}</span>{/if}
          {#if e.ar.sd}<span>{t('lib.stealthDis')}</span>{/if}
        </div>
      {/if}
      {#if e.cost || e.wt}
        <div class="facts muted">
          {#if e.cost}<span>{e.cost}</span>{/if}
          {#if e.wt}<span>{t('lib.weight', { n: e.wt })}</span>{/if}
        </div>
      {/if}
      {#if e.t}<div class="text serif">{e.t}</div>{/if}

      {#if e.x?.pick}
        <h3 class="card-title pick">{t('lib.pickBase')}</h3>
        <div class="bases">
          {#each bases as b (b.id)}
            <button class="chip" onclick={() => add(e, b)}>{b.n}</button>
          {/each}
        </div>
      {/if}
    {:else}
      <label class="search">
        <Icon name="search" size={18} />
        <input class="field" type="search" placeholder={t('lib.searchItems')} bind:value={q} enterkeyhint="search" />
      </label>
      <div class="cats">
        {#each CATS as k (k)}
          <button class="chip" class:on={cat === k} aria-pressed={cat === k} onclick={() => (cat = k)}>{t(`lib.cat.${k}`)}</button>
        {/each}
      </div>
      {#if loading}
        <div class="empty">{t('lib.loading')}</div>
      {:else if !list.length}
        <div class="empty">{t('lib.nothing')}</div>
      {:else}
        <ul class="list">
          {#each shown as e (e.id)}
            <li>
              <button class="row-btn" onclick={() => open(e)}>
                <span class="grow txt">
                  <span class="nm serif">
                    {#if e.c === 'magic'}<span class="spark"><Icon name="sparkle" size={13} stroke={2} /></span>{/if}{e.n}
                    {#if owned.has(e.id)}<span class="own"><Icon name="check" size={13} stroke={2.4} /></span>{/if}
                  </span>
                  <span class="sb">{#if lang === 'uk'}<i class="enn">{e.en}</i> · {/if}{sub(e)}</span>
                </span>
                {#if stats(e)}<span class="st num">{stats(e)}</span>{/if}
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
    {#if sel && !sel.x?.pick}
      <button class="btn btn-ink grow" onclick={() => add(sel!)}><Icon name="plus" size={20} />{t('lib.addItem')}</button>
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
    gap: 6px;
    flex-wrap: wrap;
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
  .txt {
    display: flex;
    flex-direction: column;
  }
  .nm {
    font-weight: 700;
    font-size: 16.5px;
    line-height: 1.2;
  }
  .spark {
    color: var(--ember);
    margin-right: 4px;
  }
  .own {
    color: var(--good);
    margin-left: 6px;
  }
  .enn {
    font-style: italic;
  }
  .sb {
    font-size: 12.5px;
    color: var(--ink2);
  }
  .st {
    font-size: 13px;
    color: var(--ink);
    text-align: right;
    max-width: 45%;
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
  .tag.att {
    background: var(--ember);
    color: var(--ember-ink);
  }
  .rar-rare {
    background: #2d5961;
  }
  .rar-veryRare {
    background: #5b3a7a;
  }
  .rar-legendary,
  .rar-artifact {
    background: #9c7420;
  }
  .stats {
    font-size: 20px;
    padding: 8px 12px;
    border-radius: 12px;
    background: rgba(42, 31, 23, 0.07);
    box-shadow: inset 0 0 0 1px rgba(150, 112, 62, 0.3);
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    font-size: 13.5px;
  }
  .text {
    white-space: pre-wrap;
    font-size: 16px;
    line-height: 1.5;
  }
  .pick {
    margin-top: 6px;
  }
  .bases {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .bases .chip {
    min-height: var(--tap);
  }
</style>
