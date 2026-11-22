<script lang="ts">
  /** Левая колонка журнала: поиск, вкладки «Сесії / NPC / Місця / Завдання», список. */
  import Icon from '../../components/Icon.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import { journal } from '../../lib/stores/journal.svelte';
  import { codex } from '../../lib/stores/codex.svelte';
  import { extractMentions, mentionsToNames, markParts } from '../../lib/mentions';
  import { t } from '../../lib/i18n';
  import type { CodexKind, JournalEntry } from '../../lib/model/types';
  import { jv, type JournalTab, type Sel } from './state.svelte';
  import { compareEntries, entryLabel, monthHeader, monthKey, searchSnippet, statusTone } from './format';
  import CodexAvatar from './CodexAvatar.svelte';

  let { onpick, oncreate, scroll = false }: { onpick: (s: Sel) => void; oncreate: (kind: CodexKind) => void; scroll?: boolean } = $props();

  const tabs: { value: JournalTab; label: string }[] = [
    { value: 'sessions', label: t('journal.tab.sessions') },
    { value: 'npc', label: t('journal.tab.npc') },
    { value: 'place', label: t('journal.tab.place') },
    { value: 'quest', label: t('journal.tab.quest') },
  ];

  const q = $derived(jv.q.trim());

  type Group = { key: string; label: string; items: JournalEntry[] };
  const groups = $derived.by((): Group[] => {
    const list = journal.search(jv.q).slice().sort(compareEntries);
    const out: Group[] = [];
    const pinned = list.filter((e) => e.pinned);
    if (pinned.length) out.push({ key: 'pinned', label: t('journal.pinnedGroup').toUpperCase(), items: pinned });
    for (const e of list) {
      if (e.pinned) continue;
      const k = monthKey(e.date);
      let g = out.find((x) => x.key === k);
      if (!g) out.push((g = { key: k, label: monthHeader(e.date), items: [] }));
      g.items.push(e);
    }
    return out;
  });

  const codexList = $derived.by(() => {
    if (jv.tab === 'sessions') return [];
    const s = q.toLowerCase();
    return codex.byKind(jv.tab).filter((c) => !s || c.name.toLowerCase().includes(s) || mentionsToNames(c.text).toLowerCase().includes(s) || c.status.toLowerCase().includes(s));
  });

  function firstLine(text: string): string {
    return (
      mentionsToNames(text)
        .split('\n')
        .map((x) => x.trim())
        .find(Boolean) ?? ''
    );
  }

  function isSel(kind: Sel['kind'], id: string) {
    return jv.sel?.kind === kind && jv.sel.id === id;
  }
</script>

<div class="jl panel" class:scroll>
  <div class="search">
    <Icon name="search" size={20} />
    <input
      type="search"
      bind:value={jv.q}
      placeholder={jv.tab === 'sessions' ? t('journal.search') : t('journal.searchCodex')}
      enterkeyhint="search"
      autocomplete="off"
    />
    {#if jv.q}
      <button class="clr" aria-label={t('journal.clearSearch')} onclick={() => (jv.q = '')}><Icon name="close" size={18} /></button>
    {/if}
  </div>
  <div class="tabs"><Segmented bind:value={jv.tab} options={tabs} /></div>

  <div class="items">
    {#if jv.tab === 'sessions'}
      {#each groups as g (g.key)}
        <div class="mon">
          {#if g.key === 'pinned'}<span class="star"><Icon name="star" size={12} fill /></span>{/if}{g.label}
        </div>
        {#each g.items as e (e.id)}
          {@const tags = extractMentions(e.text)}
          {@const x = q ? searchSnippet(e, q) : searchSnippet(e, '')}
          <button class="je" class:sel={isSel('entry', e.id)} onclick={() => onpick({ kind: 'entry', id: e.id })}>
            <span class="sn">
              {#if e.kind === 'session'}
                <i>{t('journal.box.session')}</i><b>{e.sessionNo ?? '—'}</b>
              {:else}
                <i>{t('journal.box.note')}</i><Icon name="feather" size={20} />
              {/if}
            </span>
            <span class="body">
              <span class="t">{entryLabel(e)}</span>
              <span class="x" class:none={!x}>
                {#if x}
                  {#each markParts(x, q) as p, i (i)}{#if p.mark}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}
                {:else}
                  {t('journal.emptyText')}
                {/if}
              </span>
              {#if tags.length}<span class="tg">{tags.slice(0, 4).join(' · ')}{tags.length > 4 ? ' …' : ''}</span>{/if}
            </span>
            {#if e.pinned}<span class="pin" aria-label={t('journal.pinnedGroup')}><Icon name="star" size={16} fill /></span>{/if}
          </button>
        {/each}
      {:else}
        <div class="empty">{q ? t('journal.empty.search', { q }) : t('journal.empty.sessions')}</div>
      {/each}
    {:else}
      {@const kind = jv.tab}
      <button class="btn btn-outline add" onclick={() => oncreate(kind)}><Icon name="plus" size={20} />{t(`journal.codex.add.${kind}`)}</button>
      {#each codexList as c (c.id)}
        {@const line = firstLine(c.text)}
        <button class="ce" class:sel={isSel('codex', c.id)} onclick={() => onpick({ kind: 'codex', id: c.id })}>
          <CodexAvatar entry={c} size={44} radius={12} />
          <span class="body">
            <span class="t">{c.name || '—'}</span>
            {#if line}<span class="x">{line}</span>{/if}
          </span>
          {#if c.status}<span class="st {statusTone(c.status)}">{c.status}</span>{/if}
        </button>
      {:else}
        <div class="empty">{q ? t('journal.empty.search', { q }) : t(`journal.empty.${kind}`)}</div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .jl {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    min-width: 0;
  }
  .jl.scroll {
    max-height: 100%;
    min-height: 0;
  }
  .scroll .items {
    overflow-y: auto;
    overscroll-behavior: contain;
    min-height: 0;
    flex: 1;
    margin: 0 -6px;
    padding: 0 6px;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    height: var(--tap);
    border-radius: 24px;
    background: var(--bg3);
    padding: 0 6px 0 16px;
    color: var(--muted);
    border: 1.5px solid transparent;
  }
  .search:focus-within {
    border-color: var(--ember);
  }
  .search input {
    flex: 1;
    min-width: 0;
    height: 100%;
    background: none;
    border: none;
    outline: none;
    color: var(--text);
    font-size: 15px;
  }
  .search input::-webkit-search-cancel-button {
    display: none;
  }
  .clr {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .tabs :global(.seg button) {
    padding: 0 4px;
    font-size: 13.5px;
  }
  .items {
    display: flex;
    flex-direction: column;
  }
  .mon {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    letter-spacing: 0.14em;
    color: var(--muted);
    font-weight: 700;
    padding: 12px 2px 8px;
    border-bottom: 1px solid var(--line);
  }
  .star {
    color: var(--gold);
    display: inline-flex;
  }
  .je,
  .ce {
    display: flex;
    gap: 12px;
    padding: 12px 6px;
    border-bottom: 1px solid var(--line);
    align-items: flex-start;
    text-align: left;
    width: 100%;
    min-height: 64px;
    border-radius: 0;
  }
  .ce {
    align-items: center;
  }
  .je.sel,
  .ce.sel {
    background: var(--ember-soft);
    border-radius: 12px;
    border-bottom-color: transparent;
  }
  .je:active,
  .ce:active {
    background: var(--ember-soft);
  }
  .sn {
    width: 52px;
    height: 56px;
    border: 1.5px solid var(--line2);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--parch);
  }
  .sn b {
    font-family: var(--font-serif);
    font-size: 24px;
    color: var(--parch);
    line-height: 1;
  }
  .sn i {
    font-style: normal;
    font-size: 8.5px;
    font-weight: 600;
    color: var(--muted);
    letter-spacing: 0.06em;
    margin-bottom: 2px;
  }
  .body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .t {
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 18px;
    line-height: 1.2;
    color: var(--parch);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .x {
    font-size: 13px;
    color: var(--muted);
    margin-top: 2px;
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .x.none {
    font-style: italic;
    opacity: 0.7;
  }
  .x mark {
    background: color-mix(in srgb, var(--ember) 35%, transparent);
    color: var(--text);
    border-radius: 3px;
  }
  .tg {
    font-size: 12px;
    color: color-mix(in srgb, var(--gold) 55%, var(--muted));
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pin {
    color: var(--gold);
    flex-shrink: 0;
    padding-top: 2px;
  }
  .add {
    margin: 4px 0 6px;
    width: 100%;
  }
  .av {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-sc);
    font-size: 20px;
    font-weight: 700;
    color: var(--parch3);
  }
  .av.npc {
    background: var(--t-wine);
  }
  .av.place {
    background: var(--t-teal);
  }
  .av.quest {
    background: var(--t-ochre);
  }
  .st {
    font-size: 12px;
    font-weight: 700;
    border-radius: 8px;
    padding: 3px 8px;
    flex-shrink: 0;
    max-width: 40%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    background: var(--bg3);
    color: var(--text);
  }
  .st.good {
    background: var(--good);
    color: var(--parch3);
  }
  .st.bad {
    background: var(--bad);
    color: var(--parch3);
  }
  .st.gold {
    background: var(--gold);
    color: var(--ember-ink);
  }
  .empty {
    line-height: 1.5;
  }
</style>
