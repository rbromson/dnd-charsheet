<script lang="ts">
  /**
   * Журнал: список сессий и справочника слева, запись в центре, карточка NPC/місця/завдання справа.
   * Узкий экран: список → запись (кнопка «Назад»), карточки справочника — в боковой панели.
   */
  import { untrack } from 'svelte';
  import TopBar from '../../components/TopBar.svelte';
  import Icon from '../../components/Icon.svelte';
  import JournalList from './JournalList.svelte';
  import EntryDetail from './EntryDetail.svelte';
  import CodexCard from './CodexCard.svelte';
  import CodexSheet from './CodexSheet.svelte';
  import UpdateSheet from './UpdateSheet.svelte';
  import { journal } from '../../lib/stores/journal.svelte';
  import { codex } from '../../lib/stores/codex.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';
  import type { CodexKind } from '../../lib/model/types';
  import { jv, type Sel } from './state.svelte';
  import { compareEntries } from './format';

  let w = $state(typeof window !== 'undefined' ? window.innerWidth - 96 : 1000);
  const twoPane = $derived(w >= 760);
  const threePane = $derived(w >= 1080);

  const selEntry = $derived(jv.sel?.kind === 'entry' ? journal.get(jv.sel.id) : undefined);
  const selCodex = $derived(jv.sel?.kind === 'codex' ? codex.get(jv.sel.id) : undefined);
  const sideItem = $derived(threePane && jv.side && jv.side !== selCodex?.id ? codex.get(jv.side) : undefined);

  function latest(): Sel | null {
    const list = journal.entries.slice().sort(compareEntries);
    const e = list.find((x) => x.kind === 'session') ?? list[0];
    return e ? { kind: 'entry', id: e.id } : null;
  }

  /** Открыть запись/карточку в центре. syncTab — переключить вкладку списка под выбранное. */
  function pick(s: Sel, syncTab = false) {
    jv.sel = s;
    jv.showList = false;
    if (s.kind === 'codex') {
      if (jv.side === s.id) jv.side = null;
      if (syncTab) {
        const k = codex.get(s.id)?.kind;
        if (k) jv.tab = k;
      }
    } else if (syncTab) jv.tab = 'sessions';
  }

  function pickFromOutside(s: Sel) {
    pick(s, true);
  }

  /** Тап по упоминанию: справа на широком экране, иначе — боковая панель. */
  function openCodex(id: string) {
    if (threePane) {
      if (selCodex?.id === id) return;
      jv.side = id;
    } else {
      ui.openSheet(CodexSheet, { id, onpick: pickFromOutside });
    }
  }

  function newSession() {
    const e = journal.create('session');
    jv.q = '';
    jv.freshId = e.id;
    pick({ kind: 'entry', id: e.id }, true);
  }

  function newCodex(kind: CodexKind) {
    const c = codex.create(kind, t(`journal.codex.new.${kind}`));
    jv.q = '';
    jv.freshId = c.id;
    pick({ kind: 'codex', id: c.id });
  }

  function back() {
    jv.showList = true;
  }

  // Первое открытие для персонажа — последняя сессия
  $effect(() => {
    const cid = charStore.current?.id;
    if (!cid || journal.characterId !== cid) return;
    void journal.entries.length;
    untrack(() => {
      if (jv.initFor === cid) return;
      jv.initFor = cid;
      jv.sel = null;
      jv.side = null;
      jv.showList = false;
      jv.q = '';
      jv.tab = 'sessions';
      if (!ui.journalFocus) jv.sel = latest();
    });
  });

  // Переход из других экранов: ui.journalFocus
  $effect(() => {
    const f = ui.journalFocus;
    if (!f) return;
    const found = f.kind === 'entry' ? journal.get(f.id) : codex.get(f.id);
    const loaded = journal.characterId === charStore.current?.id;
    if (!found && !loaded) return;
    untrack(() => {
      if (found) {
        if (ui.sheet) ui.closeSheet();
        pick({ kind: f.kind, id: f.id }, true);
      }
      ui.journalFocus = null;
    });
  });

  // Выбранное удалили — показать последнюю сессию (или пусто)
  $effect(() => {
    const s = jv.sel;
    if (!s) return;
    const ok = s.kind === 'entry' ? journal.get(s.id) : codex.get(s.id);
    if (!ok)
      untrack(() => {
        jv.sel = latest();
        if (!twoPane && !jv.sel) jv.showList = true;
      });
  });
  $effect(() => {
    if (jv.side && !codex.get(jv.side)) untrack(() => (jv.side = null));
  });
</script>

<TopBar title={t('nav.journal')}>
  <button class="btn btn-outline" onclick={() => ui.openSheet(UpdateSheet, {})}><Icon name="sparkle" size={18} />{t('upd.open')}</button>
  <button class="btn btn-primary" aria-label={t('journal.newSessionAria')} onclick={newSession}><Icon name="plus" size={20} stroke={2.2} />{t('journal.newSession')}</button>
</TopBar>

{#snippet detail()}
  {#if selEntry}
    {#key selEntry.id}
      <EntryDetail entry={selEntry} autoEdit={jv.freshId === selEntry.id} onopen={openCodex} />
    {/key}
  {:else if selCodex}
    {#key selCodex.id}
      <div class="card big">
        <CodexCard
          id={selCodex.id}
          autoEdit={jv.freshId === selCodex.id}
          onopen={openCodex}
          onref={(r) => {
            if (r.kind === 'entry' && threePane) jv.side = selCodex?.id ?? null;
            pick(r, true);
          }}
        />
      </div>
    {/key}
  {:else}
    <div class="card none">
      <Icon name="journal" size={40} />
      <p>{t('journal.empty.detail')}</p>
      <button class="btn btn-ink" onclick={newSession}><Icon name="plus" size={20} />{t('journal.newSessionAria')}</button>
    </div>
  {/if}
{/snippet}

<div class="view jv" bind:clientWidth={w}>
  {#if twoPane}
    <div class="grid" class:three={!!sideItem}>
      <aside class="lcol">
        <JournalList onpick={(s) => pick(s)} oncreate={newCodex} scroll />
      </aside>
      <section class="ccol">
        {@render detail()}
      </section>
      {#if sideItem}
        {#key sideItem.id}
          <aside class="rcol">
            <div class="card side">
              <CodexCard
                id={sideItem.id}
                compact
                onopen={openCodex}
                onref={(r) => (r.kind === 'codex' ? openCodex(r.id) : pick(r, true))}
                onclose={() => (jv.side = null)}
              />
            </div>
          </aside>
        {/key}
      {/if}
    </div>
  {:else if jv.showList || !jv.sel}
    <JournalList onpick={(s) => pick(s)} oncreate={newCodex} />
  {:else}
    <div class="narrow">
      <button class="btn btn-ghost backbtn" onclick={back}><Icon name="back" />{t('journal.back')}</button>
      {@render detail()}
    </div>
  {/if}
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: minmax(280px, 330px) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  .grid.three {
    grid-template-columns: 330px minmax(0, 1fr) 300px;
  }
  .lcol,
  .rcol {
    position: sticky;
    top: 84px;
    max-height: calc(100dvh - 100px);
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
  }
  .lcol :global(.jl) {
    flex: 1;
  }
  .ccol,
  .narrow {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .side {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 16px;
  }
  .big {
    padding: 20px 22px 22px;
  }
  .none {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 48px 24px;
    text-align: center;
    color: var(--ink2);
  }
  .none p {
    margin: 0;
    max-width: 360px;
  }
  .backbtn {
    align-self: flex-start;
    margin-left: -8px;
    padding-left: 8px;
  }
</style>
