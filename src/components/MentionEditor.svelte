<script lang="ts">
  /**
   * Растущая textarea с подсказкой @-упоминаний из справочника.
   * Набери «@» и буквы → список NPC / місць / завдань; выбор вставляет `@[Имя] `.
   * <MentionEditor bind:value={entry.text} placeholder="…" rows={6} />
   */
  import { onMount, tick } from 'svelte';
  import { codex, CODEX_KINDS } from '../lib/stores/codex.svelte';
  import { findMentionQuery, insertMention, sanitizeMentionName } from '../lib/mentions';
  import type { CodexEntry, CodexKind } from '../lib/model/types';
  import { t } from '../lib/i18n';

  let {
    value = $bindable(),
    placeholder = '',
    rows = 4,
    autofocus = false,
    onsubmit,
  }: {
    value: string;
    placeholder?: string;
    rows?: number;
    autofocus?: boolean;
    /** Ctrl/Cmd+Enter */
    onsubmit?: () => void;
  } = $props();

  const GLYPH: Record<CodexKind, string> = { npc: '●', place: '◆', quest: '▲' };
  const MAX_PER_GROUP = 6;
  const PICKER_W = 320;

  let ta: HTMLTextAreaElement | undefined = $state();
  let wrap: HTMLDivElement | undefined = $state();
  let q = $state<{ start: number; query: string } | null>(null);
  let caret = 0;
  let forced = $state(false);
  let dismissed = $state(-1);
  let focused = $state(false);
  let active = $state(0);
  let pos = $state<{ top?: number; bottom?: number; left: number; width: number }>({ top: 0, left: 0, width: PICKER_W });
  let blurTimer: ReturnType<typeof setTimeout> | null = null;

  function rank(c: CodexEntry, s: string): number {
    const n = c.name.toLowerCase();
    if (!s) return 0;
    if (n.startsWith(s)) return 0;
    if (n.split(/\s+/).some((w) => w.startsWith(s))) return 1;
    return 2;
  }

  const needle = $derived(q ? q.query.trim().toLowerCase() : '');
  const matches = $derived.by(() => {
    if (!q) return [];
    const s = needle;
    return codex.items
      .filter((c) => c.name.trim() && (!s || c.name.toLowerCase().includes(s)))
      .sort((a, b) => rank(a, s) - rank(b, s) || a.name.localeCompare(b.name, 'uk'));
  });
  const groups = $derived(
    CODEX_KINDS.map((kind) => ({ kind, items: matches.filter((c) => c.kind === kind).slice(0, MAX_PER_GROUP) })).filter((g) => g.items.length),
  );
  const flat = $derived(groups.flatMap((g) => g.items));
  const createName = $derived(q ? sanitizeMentionName(q.query) : '');
  const canCreate = $derived(!!createName && !codex.byName(createName));
  const open = $derived.by(() => {
    if (!focused || !q || q.start === dismissed) return false;
    if (!q.query && !forced) return false;
    // Обычный текст после «@» (больше трёх слов без совпадений) — не мешаем
    if (!flat.length && q.query.trim().split(/\s+/).length > 3) return false;
    return true;
  });
  const optionCount = $derived(flat.length + (canCreate ? CODEX_KINDS.length : 0));

  function grow() {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 4 + 'px';
  }
  $effect(() => {
    void value;
    grow();
  });

  onMount(() => {
    if (autofocus && ta) {
      ta.focus({ preventScroll: false });
      const n = ta.value.length;
      ta.setSelectionRange(n, n);
      focused = true;
    }
  });

  const MIRROR_PROPS = [
    'box-sizing', 'width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'font-style', 'font-variant', 'font-weight',
    'font-stretch', 'font-size', 'line-height', 'font-family', 'text-align', 'text-transform', 'text-indent',
    'letter-spacing', 'word-spacing', 'tab-size',
  ];

  /** Координаты каретки внутри textarea (через зеркальный div). */
  function caretCoords(el: HTMLTextAreaElement, at: number) {
    const cs = getComputedStyle(el);
    const div = document.createElement('div');
    for (const p of MIRROR_PROPS) div.style.setProperty(p, cs.getPropertyValue(p));
    Object.assign(div.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', top: '0', left: '-9999px', height: 'auto' });
    div.textContent = el.value.slice(0, at);
    const span = document.createElement('span');
    span.textContent = el.value.slice(at) || '.';
    div.appendChild(span);
    document.body.appendChild(div);
    const top = span.offsetTop - el.scrollTop;
    const left = span.offsetLeft - el.scrollLeft;
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
    div.remove();
    return { top, left, lh };
  }

  function place() {
    if (!ta || !wrap || !q) return;
    const c = caretCoords(ta, q.start);
    const width = Math.min(PICKER_W, wrap.clientWidth);
    const left = Math.max(0, Math.min(ta.offsetLeft + c.left - 16, wrap.clientWidth - width));
    const caretTop = ta.offsetTop + c.top;
    const vv = window.visualViewport;
    const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    const caretViewportY = ta.getBoundingClientRect().top + c.top;
    const below = visibleBottom - (caretViewportY + c.lh);
    if (below < 280 && caretViewportY - (vv?.offsetTop ?? 0) > below) {
      pos = { bottom: wrap.clientHeight - caretTop + 4, left, width };
    } else {
      pos = { top: caretTop + c.lh + 4, left, width };
    }
  }

  function update() {
    if (!ta) return;
    const s = ta.selectionStart;
    const nq = ta.selectionEnd === s ? findMentionQuery(ta.value, s) : null;
    if (!nq) {
      q = null;
      forced = false;
      dismissed = -1;
      return;
    }
    if (!q || q.start !== nq.start) {
      active = 0;
      forced = false;
    } else if (q.query !== nq.query) active = 0;
    caret = s;
    q = nq;
    place();
  }

  async function pick(name: string) {
    if (!q || !ta) return;
    const r = insertMention(ta.value, q.start, caret, name);
    value = r.text;
    q = null;
    forced = false;
    await tick();
    ta.focus();
    ta.setSelectionRange(r.caret, r.caret);
    focused = true;
    grow();
  }

  function create(kind: CodexKind) {
    if (!createName) return;
    const c = codex.byName(createName) ?? codex.create(kind, createName);
    pick(c.name);
  }

  function choose(i: number) {
    if (i < flat.length) pick(flat[i].name);
    else if (canCreate) create(CODEX_KINDS[i - flat.length]);
  }

  async function atButton() {
    if (!ta) return;
    const s = ta.selectionStart ?? value.length;
    const e = ta.selectionEnd ?? s;
    const before = ta.value.slice(0, s);
    const ins = (before && !/[\s(«"']$/.test(before) ? ' ' : '') + '@';
    value = before + ins + ta.value.slice(e);
    const at = s + ins.length;
    await tick();
    ta.focus();
    ta.setSelectionRange(at, at);
    focused = true;
    dismissed = -1;
    update();
    forced = true;
  }

  function onkeydown(e: KeyboardEvent) {
    if (open && optionCount > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        active = (active + 1) % optionCount;
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        active = (active - 1 + optionCount) % optionCount;
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        choose(active);
        return;
      }
    }
    if (open && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (q) dismissed = q.start;
      return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onsubmit) {
      e.preventDefault();
      onsubmit();
    }
  }

  function onfocus() {
    if (blurTimer) clearTimeout(blurTimer);
    focused = true;
  }
  function onblur() {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = setTimeout(() => (focused = false), 200);
  }
  /** Не отдаём фокус кнопкам — клавиатура остаётся открытой. */
  function keepFocus(e: MouseEvent) {
    e.preventDefault();
  }

  function optIndex(c: CodexEntry) {
    return flat.indexOf(c);
  }
</script>

<div class="me" bind:this={wrap}>
  <textarea
    bind:this={ta}
    class="field"
    {rows}
    {placeholder}
    bind:value
    oninput={() => {
      grow();
      update();
    }}
    onclick={update}
    onkeyup={(e) => {
      if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') {
        if (!(open && (e.key === 'ArrowUp' || e.key === 'ArrowDown'))) update();
      }
    }}
    {onkeydown}
    {onfocus}
    {onblur}
    enterkeyhint="enter"
  ></textarea>
  <div class="tools">
    <button type="button" class="btn btn-ghost at" onmousedown={keepFocus} onclick={atButton} aria-label={t('journal.mention.button')}>
      <span class="sym">@</span><span class="lbl">{t('journal.mention.button')}</span>
    </button>
  </div>

  {#if open}
    <div
      class="picker"
      role="listbox"
      tabindex="-1"
      style:top={pos.top != null ? pos.top + 'px' : null}
      style:bottom={pos.bottom != null ? pos.bottom + 'px' : null}
      style:left="{pos.left}px"
      style:width="{pos.width}px"
      onmousedown={keepFocus}
    >
      {#each groups as g (g.kind)}
        <div class="g">{t(`journal.mention.group.${g.kind}`)}</div>
        {#each g.items as c (c.id)}
          {@const i = optIndex(c)}
          <button type="button" class="o" class:on={i === active} role="option" aria-selected={i === active} onclick={() => pick(c.name)}>
            <span class="ic {c.kind}">{c.name.trim()[0]?.toUpperCase() ?? GLYPH[c.kind]}</span>
            <span class="nm">{c.name}</span>
            {#if c.status}<small>{c.status}</small>{/if}
          </button>
        {/each}
      {/each}
      {#if !flat.length && !canCreate}
        <div class="emp">{t('journal.mention.empty')}</div>
      {/if}
      {#if canCreate}
        <div class="g cr">{t('journal.mention.create', { q: createName })}</div>
        <div class="create">
          {#each CODEX_KINDS as kind, k (kind)}
            <button type="button" class="ck {kind}" class:on={flat.length + k === active} onclick={() => create(kind)}>
              <span class="gl">{GLYPH[kind]}</span>{t(`journal.codex.kind.${kind}`)}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .me {
    position: relative;
  }
  textarea {
    display: block;
    overflow: hidden;
    resize: none;
    font-size: 15.5px;
    line-height: 1.6;
    min-height: 96px;
  }
  .tools {
    display: flex;
    justify-content: flex-end;
    margin-top: 2px;
  }
  .at {
    min-height: var(--tap);
    padding: 0 12px;
    gap: 6px;
    font-size: 14px;
    opacity: 0.8;
  }
  .sym {
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 20px;
    color: var(--ember);
  }
  .picker {
    position: absolute;
    z-index: 30;
    max-height: 320px;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: var(--parch3);
    color: var(--ink);
    border-radius: 14px;
    box-shadow:
      0 12px 30px rgba(0, 0, 0, 0.35),
      inset 0 0 0 1px var(--edge);
    padding: 8px;
  }
  .g {
    font-size: 10.5px;
    letter-spacing: 0.14em;
    color: var(--ink2);
    font-weight: 700;
    padding: 6px 8px 4px;
  }
  .g.cr {
    letter-spacing: 0.04em;
    font-size: 12px;
    padding-top: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .o {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: var(--tap);
    padding: 0 8px;
    border-radius: 10px;
    font-size: 15px;
    text-align: left;
  }
  .o.on,
  .ck.on {
    background: var(--ember-soft);
  }
  .o:active,
  .ck:active {
    background: color-mix(in srgb, var(--ember) 25%, transparent);
  }
  .nm {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .o small {
    color: var(--ink2);
    font-size: 12px;
  }
  .ic {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    color: var(--parch3);
    font-family: var(--font-sc);
  }
  .ic.npc {
    background: var(--t-wine);
  }
  .ic.place {
    background: var(--t-teal);
  }
  .ic.quest {
    background: var(--t-ochre);
  }
  .create {
    display: flex;
    gap: 4px;
  }
  .ck {
    flex: 1;
    min-height: var(--tap);
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    box-shadow: inset 0 0 0 1px var(--edge);
  }
  .gl {
    font-size: 11px;
  }
  .ck.npc .gl {
    color: var(--wine);
  }
  .ck.place .gl {
    color: var(--teal);
  }
  .ck.quest .gl {
    color: var(--ochre);
  }
  .emp {
    padding: 10px 8px;
    font-size: 13px;
    color: var(--ink2);
  }
</style>
