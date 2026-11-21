<script lang="ts">
  /** Запись журнала: заголовок, текст с @-упоминаниями, секрет, картинки, архив расшифровки. */
  import { onMount, untrack } from 'svelte';
  import Icon from '../../components/Icon.svelte';
  import Secret from '../../components/Secret.svelte';
  import Gallery from '../../components/Gallery.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import MentionText from '../../components/MentionText.svelte';
  import MentionEditor from '../../components/MentionEditor.svelte';
  import SessionPanel from './SessionPanel.svelte';
  import { journal } from '../../lib/stores/journal.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { todayDate } from '../../lib/model/ids';
  import { t } from '../../lib/i18n';
  import type { EntryKind, JournalEntry, TranscriptSegment } from '../../lib/model/types';
  import { entryKicker, entryLabel, timeOf } from './format';
  import { jv } from './state.svelte';

  let { entry: entryProp, autoEdit = false, onopen }: { entry: JournalEntry; autoEdit?: boolean; onopen: (codexId: string) => void } = $props();

  /** Живой объект из стора (bind: к его полям — без предупреждений о владении). */
  const entry = $derived(journal.get(entryProp.id) ?? entryProp);

  let localEdit = $state(untrack(() => autoEdit));
  let focusText = $state(untrack(() => autoEdit));
  const editing = $derived(ui.editing || localEdit);

  onMount(() => {
    if (autoEdit) jv.freshId = null;
  });

  function startEdit() {
    if (editing) return;
    focusText = true;
    localEdit = true;
  }

  function finish() {
    localEdit = false;
    focusText = false;
  }

  function togglePin() {
    journal.update(entry.id, { pinned: !entry.pinned });
  }

  function setKind(k: EntryKind) {
    if (k === 'session' && entry.sessionNo == null) entry.sessionNo = journal.nextSessionNo;
  }

  function fixDate() {
    if (!entry.date) entry.date = todayDate();
  }

  async function del() {
    const ok = await ui.confirm(t('journal.deleteConfirm', { name: entryLabel(entry) }), { danger: true, okLabel: t('common.delete') });
    if (ok) await journal.remove(entry.id);
  }

  function segText(s: TranscriptSegment): string {
    if (s.text.trim()) return s.text;
    if (s.status === 'pending') return t('journal.seg.pending');
    if (s.status === 'error') return t('journal.seg.error');
    return t('journal.seg.none');
  }
</script>

{#if entry.kind === 'session'}
  <SessionPanel {entry} />
{/if}

<article class="card entry" class:editing>
  <header class="eh">
    <div class="grow">
      <div class="kicker">{entryKicker(entry)}</div>
      {#if editing}
        <input class="field ttl serif" bind:value={entry.title} placeholder={t('journal.titlePh')} aria-label={t('journal.titleLabel')} enterkeyhint="done" />
      {:else}
        <h2 class="etitle serif">{entryLabel(entry)}</h2>
      {/if}
    </div>
    <div class="acts">
      <button
        class="btn btn-ghost pin"
        class:on={entry.pinned}
        aria-pressed={entry.pinned}
        aria-label={entry.pinned ? t('journal.unpin') : t('journal.pin')}
        title={entry.pinned ? t('journal.unpin') : t('journal.pin')}
        onclick={togglePin}><Icon name="star" fill={entry.pinned} /></button
      >
      {#if !ui.editing}
        {#if localEdit}
          <button class="btn btn-ink" onclick={finish}><Icon name="check" size={20} />{t('journal.done')}</button>
        {:else}
          <button class="btn btn-outline" onclick={startEdit}><Icon name="edit" size={20} />{t('journal.write')}</button>
        {/if}
      {/if}
    </div>
  </header>

  {#if editing}
    <div class="meta">
      <div class="kind">
        <span class="label">{t('journal.kindLabel')}</span>
        <Segmented
          bind:value={entry.kind}
          onchange={setKind}
          options={[
            { value: 'session', label: t('journal.kind.session') },
            { value: 'note', label: t('journal.kind.note') },
          ]}
        />
      </div>
      {#if entry.kind === 'session'}
        <div class="no"><NumberField bind:value={entry.sessionNo} label={t('journal.sessionNo')} nullable min={0} /></div>
      {/if}
      <label class="dt">
        <span class="label">{t('journal.date')}</span>
        <input class="field" type="date" bind:value={entry.date} onchange={fixDate} />
      </label>
    </div>
    <MentionEditor bind:value={entry.text} placeholder={t('journal.textPh')} rows={8} autofocus={focusText} />
  {:else}
    <div
      class="prose"
      role="button"
      tabindex="0"
      onclick={startEdit}
      onkeydown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) startEdit();
      }}
    >
      {#if entry.text.trim()}
        <MentionText text={entry.text} {onopen} />
      {:else}
        <span class="ph"><Icon name="feather" size={18} />{t('journal.tapToWrite')}</span>
      {/if}
    </div>
  {/if}

  <Secret bind:value={entry.secret} editable={editing} />

  {#if editing || entry.images.length}
    <section class="sec">
      <div class="label">{t('journal.images')}</div>
      <Gallery bind:ids={entry.images} characterId={entry.characterId} size={110} />
    </section>
  {/if}

  {#if entry.transcript.length}
    <details class="tr">
      <summary><Icon name="wave" size={20} /><span class="grow">{t('journal.transcript', { n: entry.transcript.length })}</span><span class="chev"><Icon name="down" size={18} /></span></summary>
      <ol>
        {#each entry.transcript as s (s.id)}
          <li>
            <span class="tm num">{timeOf(s.at)}</span>
            <span class="tx" class:muted={!s.text.trim()}>{segText(s)}</span>
          </li>
        {/each}
      </ol>
    </details>
  {/if}

  {#if editing}
    <div class="foot">
      <button class="btn btn-danger" onclick={del}><Icon name="trash" size={20} />{t('journal.deleteEntry')}</button>
    </div>
  {/if}
</article>

<style>
  .entry {
    padding: 18px 22px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }
  .eh {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .kicker {
    font-size: 10.5px;
    letter-spacing: 0.16em;
    font-weight: 700;
    color: var(--ink2);
    text-transform: uppercase;
  }
  .etitle {
    font-size: 30px;
    line-height: 1.1;
    margin: 2px 0 0;
    overflow-wrap: anywhere;
  }
  .ttl {
    margin-top: 4px;
    font-size: 24px;
    font-weight: 700;
  }
  .acts {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    align-items: center;
  }
  .pin {
    color: var(--ink2);
  }
  .pin.on {
    color: var(--gold);
    filter: drop-shadow(0 0 6px var(--gold-glow));
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-end;
  }
  .kind {
    min-width: 220px;
  }
  .no {
    width: 110px;
  }
  .dt {
    display: block;
    min-width: 170px;
  }
  .prose {
    font-size: 15.5px;
    line-height: 1.65;
    color: var(--ink);
    min-height: 120px;
    cursor: text;
    border-radius: 10px;
    margin: 0 -8px;
    padding: 4px 8px;
    outline: none;
  }
  .prose:focus-visible {
    box-shadow: 0 0 0 2px var(--ember);
  }
  .ph {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--ink2);
    font-style: italic;
    min-height: var(--tap);
  }
  .sec {
    display: flex;
    flex-direction: column;
  }
  .tr {
    border-radius: 12px;
    background: rgba(42, 31, 23, 0.06);
  }
  .tr summary {
    list-style: none;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: var(--tap);
    padding: 0 12px;
    font-weight: 600;
    cursor: pointer;
    color: var(--ink2);
  }
  .tr summary::-webkit-details-marker {
    display: none;
  }
  .chev {
    display: inline-flex;
    transition: transform 0.15s;
  }
  .tr[open] .chev {
    transform: rotate(180deg);
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 420px;
    overflow-y: auto;
  }
  li {
    display: flex;
    gap: 10px;
    font-size: 14px;
    line-height: 1.5;
  }
  .tm {
    color: var(--ink2);
    font-size: 13px;
    flex-shrink: 0;
    width: 44px;
  }
  .tx {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    padding-top: 6px;
    border-top: 1px solid rgba(107, 90, 72, 0.25);
  }
</style>
