/**
 * «Надіслати в Claude»: системное «Поделиться» с текстом (приложение Claude на Android
 * принимает текст, не аудио). Нет share — копируем в буфер обмена.
 */
import type { JournalEntry } from '../model/types';
import { journal } from '../stores/journal.svelte';
import { codex } from '../stores/codex.svelte';
import { charStore } from '../stores/characters.svelte';
import { buildClaudeText, unsentSegments, segmentsWithText, type CodexNames } from './claude';
import { t } from '../i18n';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'empty' | 'failed';

function names(): CodexNames {
  return {
    npc: codex.byKind('npc').map((x) => x.name),
    place: codex.byKind('place').map((x) => x.name),
    quest: codex.byKind('quest').map((x) => x.name),
  };
}

function title(entry: JournalEntry): string {
  const word = t('journal.kind.session');
  return [entry.sessionNo != null ? `${word} ${entry.sessionNo}` : '', entry.title].filter(Boolean).join(' · ') || word;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function markSent(entryId: string, ids: string[]) {
  for (const id of ids) journal.updateSegment(entryId, id, { sentToClaude: true });
}

/** Вызывать прямо из обработчика нажатия (share требует жеста пользователя). */
export async function shareToClaude(entry: JournalEntry): Promise<ShareResult> {
  const segs = unsentSegments(entry);
  if (!segs.length) return 'empty';
  const text = buildClaudeText(entry, segs, names(), charStore.current?.name ?? '');
  const ids = segs.map((s) => s.id);
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: title(entry), text });
      markSent(entry.id, ids);
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled';
      // NotAllowedError и т.п. — пробуем буфер обмена
    }
  }
  if (await copyText(text)) {
    markSent(entry.id, ids);
    return 'copied';
  }
  return 'failed';
}

/** Копировать всю расшифровку записи вместе с просьбой (ничего не помечает отправленным). */
export async function copyTranscript(entry: JournalEntry): Promise<ShareResult> {
  const segs = segmentsWithText(entry);
  if (!segs.length) return 'empty';
  const text = buildClaudeText({ ...entry, transcript: [] }, segs, names(), charStore.current?.name ?? '');
  return (await copyText(text)) ? 'copied' : 'failed';
}
