<script lang="ts" module>
  /** Черновик живёт в памяти между открытиями (случайно закрыли — текст на месте). */
  let draft = $state('');
</script>

<script lang="ts">
  /**
   * Быстрая заметка (FAB «перо» в навигации): дописывается строкой с временем в сегодняшнюю сессию.
   */
  import MentionEditor from './MentionEditor.svelte';
  import Icon from './Icon.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { journal } from '../lib/stores/journal.svelte';
  import { todayDate } from '../lib/model/ids';
  import { lang, t } from '../lib/i18n';
  import { charStore } from '../lib/stores/characters.svelte';
  import { codex } from '../lib/stores/codex.svelte';
  import { buildUpdatePrompt } from '../lib/update-prompt';
  import { historyForPrompt } from '../lib/digest';
  import { shareOrCopy } from '../lib/session/share';
  import UpdateSheet from '../views/journal/UpdateSheet.svelte';
  import { fade, fly } from 'svelte/transition';

  /** Куда попадёт заметка — та же логика, что в journal.currentSession(), но без создания. */
  const target = $derived.by(() => {
    const last = journal.entries
      .filter((e) => e.kind === 'session')
      .sort((a, b) => (b.sessionNo ?? 0) - (a.sessionNo ?? 0))[0];
    if (last && last.date === todayDate()) {
      const name = last.title.trim() ? `${t('journal.sessionN', { n: last.sessionNo ?? '' })} · ${last.title.trim()}` : t('journal.sessionN', { n: last.sessionNo ?? '' });
      return `${name} (${t('journal.today')})`;
    }
    return t('journal.quick.toNew', { n: journal.nextSessionNo });
  });

  function close() {
    ui.quickNoteOpen = false;
  }

  function save() {
    const text = draft.trim();
    if (!text) {
      close();
      return;
    }
    const e = journal.quickNote(text);
    // journal.quickNote дописывает «[ЧЧ:ММ] текст» (8 символов префикса) через перевод строки
    const added = e.text.slice(-(8 + text.length));
    draft = '';
    close();
    ui.toast(t('journal.quick.added', { n: e.sessionNo ?? '' }), () => {
      // Отменить: убрать дописанную строку и вернуть текст в черновик
      const cur = journal.get(e.id);
      if (cur && cur.text.endsWith(added)) cur.text = cur.text.slice(0, -added.length).replace(/\n$/, '');
      draft = text;
    });
  }

  /** Заметка → ШІ (с инструкцией и историей), сразу открываем «ШІ → аркуш» ждать ответ. */
  async function viaAi() {
    const c = charStore.current;
    if (!c) return;
    const text = draft.trim();
    if (!text) {
      close();
      ui.openSheet(UpdateSheet, {});
      return;
    }
    const prompt = buildUpdatePrompt(c, codex.items, text, lang, historyForPrompt(codex.items, journal.entries));
    const r = await shareOrCopy(prompt, t('upd.title'));
    if (r !== 'shared' && r !== 'copied') {
      if (r === 'failed') ui.toast(t('session.claude.failed'));
      return;
    }
    close();
    ui.openSheet(UpdateSheet, { sent: r });
  }

  function cancel() {
    const was = draft;
    draft = '';
    close();
    if (was.trim()) ui.toast(t('journal.quick.cleared'), () => (draft = was));
  }

  function onkeydown(e: KeyboardEvent) {
    if (ui.quickNoteOpen && e.key === 'Escape' && !e.defaultPrevented) close();
  }
</script>

<svelte:window {onkeydown} />

{#if ui.quickNoteOpen}
  <div class="scrim" role="presentation" transition:fade={{ duration: 120 }} onclick={close}></div>
  <div class="qn card" role="dialog" aria-modal="true" aria-label={t('journal.quick.title')} transition:fly={{ y: 40, duration: 180 }}>
    <div class="head">
      <Icon name="feather" size={22} />
      <div class="grow">
        <h2 class="serif">{t('journal.quick.title')}</h2>
        <div class="to">{t('journal.quick.to', { name: target })}</div>
      </div>
      <button class="btn btn-ghost" aria-label={t('common.close')} onclick={close}><Icon name="close" /></button>
    </div>
    <MentionEditor bind:value={draft} placeholder={t('journal.quick.ph')} rows={4} autofocus onsubmit={save} />
    <div class="row actions">
      <span class="hint muted">{t('journal.quick.hint')}</span>
      <div class="grow"></div>
      <button class="btn btn-outline" onclick={cancel}>{t('common.cancel')}</button>
      <button class="btn btn-outline ai" onclick={viaAi} title={t('journal.quick.aiHint')}><Icon name="sparkle" size={20} />{t('journal.quick.ai')}</button>
      <button class="btn btn-primary save" onclick={save}><Icon name="check" size={20} />{t('journal.quick.save')}</button>
    </div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(8, 5, 4, 0.55);
    z-index: 45;
  }
  .qn {
    position: fixed;
    z-index: 46;
    left: calc(96px + 16px);
    right: 16px;
    bottom: 16px;
    margin: 0 auto;
    max-width: 760px;
    padding: 14px 18px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    box-shadow:
      inset 0 0 0 1px var(--edge),
      0 20px 50px rgba(0, 0, 0, 0.6);
  }
  /* длинный черновик прокручивается внутри поля; панель без overflow — подсказка @ не обрезается */
  .qn :global(textarea) {
    max-height: 42dvh;
    overflow-y: auto;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--ink);
  }
  h2 {
    font-size: 22px;
    line-height: 1.1;
  }
  .to {
    font-size: 13px;
    color: var(--ink2);
  }
  .actions {
    flex-wrap: wrap;
  }
  .hint {
    font-size: 12px;
  }
  .save {
    min-width: 160px;
    min-height: 56px;
    font-size: 17px;
  }
  .ai {
    color: var(--ink);
  }
  @media (pointer: coarse) {
    .hint {
      display: none;
    }
  }
  @media (max-width: 640px) {
    .qn {
      left: 8px;
      right: 8px;
      bottom: 8px;
      padding: 12px 14px 14px;
    }
  }
</style>
