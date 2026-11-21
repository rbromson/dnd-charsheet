<script lang="ts">
  /** Карточка справочника (NPC / місце / завдання): имя, статус, описание, секрет, картинки, «Де згадувався». */
  import { onMount, untrack } from 'svelte';
  import Icon from '../../components/Icon.svelte';
  import Secret from '../../components/Secret.svelte';
  import Gallery from '../../components/Gallery.svelte';
  import MentionText from '../../components/MentionText.svelte';
  import MentionEditor from '../../components/MentionEditor.svelte';
  import { codex } from '../../lib/stores/codex.svelte';
  import { journal } from '../../lib/stores/journal.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { markParts, sanitizeMentionName } from '../../lib/mentions';
  import { t } from '../../lib/i18n';
  import type { Sel } from './state.svelte';
  import { jv } from './state.svelte';
  import { codexInitial, entryShort, statusPresets, statusTone } from './format';

  let {
    id,
    compact = false,
    header = true,
    autoEdit = false,
    onopen,
    onref,
    onclose,
  }: {
    id: string;
    compact?: boolean;
    /** false — имя и аватар рисует обрамление (SheetFrame) */
    header?: boolean;
    autoEdit?: boolean;
    onopen: (codexId: string) => void;
    onref: (ref: Sel) => void;
    onclose?: () => void;
  } = $props();

  const c = $derived(codex.get(id));
  let localEdit = $state(untrack(() => autoEdit));
  const editing = $derived(ui.editing || localEdit);

  let nameDraft = $state(untrack(() => codex.get(id)?.name ?? ''));
  let nameFocused = $state(false);
  let nameInput: HTMLInputElement | undefined = $state();
  $effect(() => {
    const n = c?.name ?? '';
    if (!untrack(() => nameFocused)) nameDraft = n;
  });

  onMount(() => {
    if (autoEdit) {
      jv.freshId = null;
      nameInput?.focus();
      nameInput?.select();
    }
  });

  const refs = $derived(c ? codex.mentionsOf(c.id) : []);
  const presets = $derived(c ? statusPresets(c.kind) : []);

  function commitName() {
    nameFocused = false;
    if (!c) return;
    const n = sanitizeMentionName(nameDraft);
    if (!n) {
      nameDraft = c.name;
      return;
    }
    if (n === c.name) return;
    const other = codex.byName(n);
    if (other && other.id !== c.id) {
      ui.toast(t('journal.codex.dupName', { name: n }));
      nameDraft = c.name;
      return;
    }
    codex.update(c.id, { name: n });
    nameDraft = n;
  }

  function setStatus(s: string) {
    if (!c) return;
    codex.update(c.id, { status: c.status === s ? '' : s });
  }

  function refTitle(r: { kind: 'entry' | 'codex'; id: string; title: string }): string {
    if (r.kind === 'entry') {
      const e = journal.get(r.id);
      return e ? entryShort(e) : r.title;
    }
    return r.title;
  }

  async function del() {
    if (!c) return;
    const ok = await ui.confirm(t('journal.codex.deleteConfirm', { name: c.name }), { danger: true, okLabel: t('common.delete') });
    if (ok) await codex.remove(c.id);
  }
</script>

{#if c}
  <div class="cx" class:compact>
    {#if header}
      <div class="top">
        <div class="av {c.kind}">{codexInitial(c)}</div>
        <div class="grow">
          <div class="nm serif">{c.name || '—'}</div>
          <div class="kd">{t(`journal.codex.kind.${c.kind}`)}</div>
        </div>
        {#if onclose}
          <button class="btn btn-ghost x" aria-label={t('common.close')} onclick={onclose}><Icon name="close" /></button>
        {/if}
      </div>
    {/if}

    <div class="bar">
      {#if c.status && !editing}<span class="st {statusTone(c.status)}">{c.status}</span>{/if}
      <div class="grow"></div>
      {#if !ui.editing}
        {#if localEdit}
          <button class="btn btn-ink" onclick={() => (localEdit = false)}><Icon name="check" size={20} />{t('journal.done')}</button>
        {:else}
          <button class="btn btn-outline" onclick={() => (localEdit = true)}><Icon name="edit" size={20} />{t('common.edit')}</button>
        {/if}
      {/if}
    </div>

    {#if editing}
      <label class="blk">
        <span class="label">{t('journal.codex.name')}</span>
        <input
          bind:this={nameInput}
          class="field serif nmi"
          bind:value={nameDraft}
          onfocus={() => (nameFocused = true)}
          onblur={commitName}
          onkeydown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
          }}
          enterkeyhint="done"
        />
      </label>
      <div class="blk">
        <span class="label">{t('journal.codex.status')}</span>
        {#if presets.length}
          <div class="chips">
            {#each presets as p (p)}
              <button class="chip" class:on={c.status === p} onclick={() => setStatus(p)}>{p}</button>
            {/each}
          </div>
        {/if}
        <input class="field" bind:value={c.status} placeholder={t('journal.codex.statusPh')} enterkeyhint="done" />
      </div>
      <MentionEditor bind:value={c.text} placeholder={t('journal.codex.textPh')} rows={compact ? 4 : 6} />
    {:else}
      <div class="txt">
        {#if c.text.trim()}
          <MentionText text={c.text} {onopen} />
        {:else}
          <span class="muted">{t('journal.codex.noText')}</span>
        {/if}
      </div>
    {/if}

    <Secret bind:value={c.secret} editable={editing} compact />

    {#if editing || c.images.length}
      <Gallery bind:ids={c.images} characterId={c.characterId} size={compact ? 72 : 100} />
    {/if}

    <div class="back">
      <div class="ct">{t('journal.codex.mentions', { n: refs.length })}</div>
      {#each refs as r (r.kind + r.id)}
        <button class="bi" onclick={() => onref({ kind: r.kind, id: r.id })}>
          <b>{refTitle(r)}</b>
          <span class="sn">{#each markParts(r.snippet, c.name) as p, i (i)}{#if p.mark}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}</span>
        </button>
      {:else}
        <div class="none muted">{t('journal.codex.noMentions', { name: c.name })}</div>
      {/each}
    </div>

    {#if editing}
      <div class="foot">
        <button class="btn btn-danger" onclick={del}><Icon name="trash" size={20} />{t('journal.codex.delete')}</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .cx {
    display: flex;
    flex-direction: column;
    gap: 12px;
    color: var(--ink);
    min-width: 0;
  }
  .top {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .av {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-sc);
    font-size: 28px;
    font-weight: 700;
    color: var(--parch3);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  }
  .compact .av {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    font-size: 23px;
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
  .nm {
    font-weight: 700;
    font-size: 26px;
    line-height: 1.15;
    overflow-wrap: anywhere;
  }
  .compact .nm {
    font-size: 20px;
  }
  .kd {
    font-size: 12px;
    color: var(--ink2);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .x {
    align-self: flex-start;
    margin: -6px -8px 0 0;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: var(--tap);
  }
  .st {
    font-size: 12.5px;
    font-weight: 700;
    border-radius: 8px;
    padding: 4px 10px;
    background: rgba(42, 31, 23, 0.1);
    color: var(--ink);
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
  .blk {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .blk .label {
    margin: 0;
  }
  .nmi {
    font-size: 20px;
    font-weight: 700;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chips .chip {
    min-height: var(--tap);
  }
  .txt {
    font-size: 15px;
    line-height: 1.6;
  }
  .compact .txt {
    font-size: 14px;
    line-height: 1.55;
  }
  .ct {
    font-family: var(--font-sc);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.08em;
    color: var(--ink2);
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .back {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13.5px;
    line-height: 1.45;
  }
  .bi {
    text-align: left;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(42, 31, 23, 0.06);
    min-height: var(--tap);
    display: block;
    width: 100%;
  }
  .bi:active {
    background: var(--ember-soft);
  }
  .bi b {
    font-family: var(--font-serif);
    font-size: 15px;
    margin-right: 6px;
  }
  .bi mark {
    background: color-mix(in srgb, var(--ember) 28%, transparent);
    color: var(--ink);
    border-radius: 4px;
    padding: 0 3px;
  }
  .none {
    font-size: 13px;
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    padding-top: 6px;
    border-top: 1px solid rgba(107, 90, 72, 0.25);
  }
</style>
