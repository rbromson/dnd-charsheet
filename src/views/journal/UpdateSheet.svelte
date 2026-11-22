<script lang="ts">
  /**
   * «ШІ → аркуш»: 1) отдать ИИ инструкцию (с голосовым или расшифровкой), 2) вставить ответ,
   * 3) отметить нужные изменения и применить. Лист меняется с «Скасувати», журнал и довідник — записями.
   */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { journal } from '../../lib/stores/journal.svelte';
  import { codex } from '../../lib/stores/codex.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { pickFiles } from '../../lib/stores/media';
  import { buildUpdatePrompt } from '../../lib/update-prompt';
  import { historyForPrompt } from '../../lib/digest';
  import Toggle from '../../components/Toggle.svelte';
  import { lang } from '../../lib/i18n';
  import { extractJson, parseUpdate, planUpdate, applyOps, type Op } from '../../lib/update';
  import { loadItems } from '../../lib/library';
  import type { LibItem } from '../../lib/library/types';
  import { shareOrCopy, copyText } from '../../lib/session/share';
  import { t } from '../../lib/i18n';
  import { jv } from './state.svelte';

  /** открыто сразу после отправки инструкции (из «Швидкої нотатки»): ждём ответ */
  let { sent = null }: { sent?: 'shared' | 'copied' | null } = $props();

  let raw = $state('');
  let withHistory = $state(true);
  let ops = $state<Op[] | null>(null);
  let on = $state<Record<string, boolean>>({});
  let lib: LibItem[] = [];

  const c = $derived(charStore.current!);
  const chosen = $derived(ops ? ops.filter((o) => on[o.id]) : []);

  function prompt() {
    return buildUpdatePrompt(c, codex.items, '', lang, withHistory ? historyForPrompt(codex.items, journal.entries) : '');
  }
  async function share() {
    const r = await shareOrCopy(prompt(), t('upd.title'));
    if (r === 'copied') ui.toast(t('upd.copied'));
  }
  async function copy() {
    if (await copyText(prompt())) ui.toast(t('upd.copied'));
  }

  async function paste() {
    try {
      raw = await navigator.clipboard.readText();
      if (raw.trim()) await parse();
    } catch {
      ui.toast(t('upd.pasteDenied'));
    }
  }
  async function openFile() {
    const [f] = await pickFiles('.json,application/json,text/plain', false);
    if (!f) return;
    raw = await f.text();
    await parse();
  }

  async function parse() {
    let data: unknown;
    try {
      data = extractJson(raw);
    } catch {
      ui.toast(t('upd.parseError'), undefined, 6000);
      return;
    }
    if (!lib.length) lib = await loadItems().catch(() => []);
    const plan = planUpdate(c, codex.items, parseUpdate(data), lib);
    if (!plan.length) {
      ui.toast(t('upd.empty'));
      return;
    }
    ops = plan;
    on = Object.fromEntries(plan.map((o) => [o.id, !(o.type === 'item-remove' && !o.existingId)]));
  }

  function apply() {
    if (!chosen.length) return;
    const list = $state.snapshot(chosen) as Op[];
    let entryId: string | null = null;
    charStore.update(
      (ch) =>
        applyOps(list, {
          character: ch,
          lib,
          createJournal: (init) => {
            const e = journal.create('session', init);
            entryId = e.id;
          },
          createCodex: (kind, name, init) => codex.create(kind, name, init),
          updateCodex: (id, patch) => codex.update(id, patch),
          getCodex: (id) => codex.get(id),
        }),
      { undo: t('upd.applied', { n: list.length }) },
    );
    ui.closeSheet();
    if (entryId) jv.sel = { kind: 'entry', id: entryId };
  }

  const coinList = (d: Record<string, number>, keys?: string[]) =>
    Object.entries(d)
      .filter(([k, v]) => v && (!keys || keys.includes(k)))
      .map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${t(`gear.coin.${k}`)}`)
      .join(', ');

  function title(o: Op): string {
    switch (o.type) {
      case 'journal':
        return o.title || (o.sessionNo ? t('upd.op.journalNo', { n: o.sessionNo }) : t('upd.op.journal'));
      case 'item-add':
        return t('upd.op.itemAdd', { qty: o.qty, name: o.name });
      case 'item-remove':
        return t('upd.op.itemRemove', { qty: o.qty, name: o.name });
      case 'item-set':
        return t('upd.op.itemSet', { name: o.name, qty: o.qty });
      case 'coins':
        return t('upd.op.coins', { list: coinList(o.delta) });
      case 'xp':
        return t('upd.op.xp', { n: o.delta });
      case 'hp':
        return t('upd.op.hp', { v: o.value, max: o.max });
      case 'codex':
        return `${t(`upd.kind.${o.kind}`)}: ${o.name}`;
    }
  }
  function sub(o: Op): string {
    switch (o.type) {
      case 'journal':
        return o.text;
      case 'item-add':
        return [o.existingId ? t('upd.op.itemAddHave') : o.libId ? t('upd.op.itemAddLib') : t('upd.op.itemAddNew'), o.text].filter(Boolean).join(' · ');
      case 'item-remove':
        return !o.existingId ? t('upd.op.itemMissing') : o.have - o.qty <= 0 ? t('upd.op.itemRemoveAll') : t('upd.op.itemRemoveLeft', { n: o.have - o.qty });
      case 'coins':
        return o.short.length ? t('upd.op.coinsShort', { list: o.short.map((k) => t(`gear.coin.${k}`)).join(', ') }) : '';
      case 'codex':
        return [o.existingId ? t('upd.op.codexUpd') : t('upd.op.codexNew'), o.status ? t('upd.status', { s: o.status }) : '', o.text].filter(Boolean).join(' · ');
      default:
        return '';
    }
  }
  const warn = (o: Op) => (o.type === 'item-remove' && !o.existingId) || (o.type === 'coins' && o.short.length > 0);
  const icon = (o: Op) =>
    o.type === 'journal' ? 'journal' : o.type === 'codex' ? 'users' : o.type === 'coins' ? 'star' : o.type === 'xp' ? 'sparkle' : o.type === 'hp' ? 'heart' : 'gear';
</script>

<SheetFrame kicker={t('upd.kicker')} title={t('upd.title')}>
  {#if !ops}
    {#if sent}
      <div class="sent"><Icon name="check" size={18} stroke={2.4} />{sent === 'copied' ? t('upd.sentCopied') : t('upd.sentShared')}</div>
    {/if}
    <section class="step" class:dim={!!sent}>
      <h3 class="card-title">{t('upd.step1')}</h3>
      <p class="hint">{t('upd.step1Hint')}</p>
      <Toggle bind:checked={withHistory} label={t('upd.withHistory')} />
      <div class="row">
        <button class="btn btn-ink grow" onclick={share}><Icon name="share" size={18} />{t('upd.share')}</button>
        <button class="btn btn-outline" onclick={copy}><Icon name="copy" size={18} />{t('upd.copy')}</button>
      </div>
    </section>
    <section class="step">
      <h3 class="card-title">{t('upd.step2')}</h3>
      <textarea class="field" rows="7" placeholder={t('upd.placeholder')} bind:value={raw}></textarea>
      <div class="row wrap">
        <button class="btn btn-outline" onclick={paste}><Icon name="copy" size={18} />{t('upd.paste')}</button>
        <button class="btn btn-outline" onclick={openFile}><Icon name="upload" size={18} />{t('upd.file')}</button>
      </div>
    </section>
  {:else}
    <h3 class="card-title">{t('upd.review')}</h3>
    <ul class="ops">
      {#each ops as o (o.id)}
        <li>
          <button class="op" class:off={!on[o.id]} class:warn={warn(o)} role="checkbox" aria-checked={!!on[o.id]} onclick={() => (on[o.id] = !on[o.id])}>
            <span class="box">{#if on[o.id]}<Icon name="check" size={16} stroke={2.6} />{/if}</span>
            <span class="ic"><Icon name={icon(o)} size={18} /></span>
            <span class="grow txt">
              <span class="tt">{title(o)}</span>
              {#if sub(o)}<span class="sb" class:clip={o.type === 'journal'}>{sub(o)}</span>{/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#snippet footer()}
    {#if !ops}
      <button class="btn btn-ink grow" disabled={!raw.trim()} onclick={parse}><Icon name="check" size={18} />{t('upd.parse')}</button>
    {:else}
      <button class="btn btn-outline" onclick={() => (ops = null)}><Icon name="back" size={18} />{t('upd.back')}</button>
      <button class="btn btn-primary grow" disabled={!chosen.length} onclick={apply}><Icon name="check" size={18} />{t('upd.apply', { n: chosen.length })}</button>
    {/if}
  {/snippet}
</SheetFrame>

<style>
  .sent {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 10px 12px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
    background: rgba(127, 163, 107, 0.18);
    box-shadow: inset 0 0 0 1px rgba(127, 163, 107, 0.5);
  }
  .dim {
    opacity: 0.6;
  }
  .step {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hint {
    margin: 0;
    font-size: 13.5px;
    color: var(--ink2);
  }
  .row.wrap {
    flex-wrap: wrap;
  }
  textarea {
    font-size: 14px;
  }
  .ops {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .op {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    text-align: left;
    padding: 10px 12px;
    min-height: var(--tap);
    border-radius: 12px;
    background: rgba(42, 31, 23, 0.06);
    box-shadow: inset 0 0 0 1px rgba(150, 112, 62, 0.3);
    transition: opacity 0.15s;
  }
  .op.off {
    opacity: 0.5;
  }
  .op.warn {
    box-shadow: inset 0 0 0 1.5px rgba(192, 83, 63, 0.55);
  }
  .box {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    border-radius: 7px;
    border: 2px solid var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--parch3);
    color: var(--ink);
    margin-top: 1px;
  }
  .op:not(.off) .box {
    background: var(--ink);
    color: var(--parch);
  }
  .ic {
    color: var(--ink2);
    display: flex;
    margin-top: 3px;
  }
  .txt {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .tt {
    font-weight: 700;
    font-family: var(--font-serif);
    font-size: 16.5px;
    line-height: 1.25;
  }
  .sb {
    font-size: 13px;
    color: var(--ink2);
    white-space: pre-wrap;
  }
  .warn .sb {
    color: #8e2f20;
  }
  .clip {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
