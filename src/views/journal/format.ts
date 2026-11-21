import type { CodexEntry, CodexKind, JournalEntry } from '../../lib/model/types';
import { t } from '../../lib/i18n';
import { mentionsToNames } from '../../lib/mentions';
import { todayDate } from '../../lib/model/ids';

export const KIND_GLYPH: Record<CodexKind, string> = { npc: '●', place: '◆', quest: '▲' };

function parts(date: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  return { y: +m[1], m: +m[2], d: +m[3] };
}

/** Ключ группы «ЛИСТОПАД 2026». */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function monthHeader(date: string): string {
  const p = parts(date);
  if (!p) return date;
  return `${t(`journal.month.${p.m}`)} ${p.y}`.toUpperCase();
}

/** «21 листопада» (+ год, если не текущий). */
export function dayMonth(date: string): string {
  const p = parts(date);
  if (!p) return date;
  const s = `${p.d} ${t(`journal.monthGen.${p.m}`)}`;
  return p.y === new Date().getFullYear() ? s : `${s} ${p.y}`;
}

export function timeOf(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function isToday(date: string): boolean {
  return date === todayDate();
}

/** Заголовок записи с запасным вариантом «Сесія 7» / «Нотатка 21 листопада». */
export function entryLabel(e: JournalEntry): string {
  if (e.title.trim()) return e.title.trim();
  if (e.kind === 'session' && e.sessionNo != null) return t('journal.sessionN', { n: e.sessionNo });
  return t('journal.noteOn', { date: dayMonth(e.date) });
}

/** Короткое имя записи для ссылок («Сесія 7», «Нотатка»). */
export function entryShort(e: JournalEntry): string {
  if (e.kind === 'session' && e.sessionNo != null) return t('journal.sessionN', { n: e.sessionNo });
  return e.title.trim() || t('journal.kind.note');
}

/** «СЕСІЯ 7 · 21 ЛИСТОПАДА · 19:40» */
export function entryKicker(e: JournalEntry): string {
  const head = e.kind === 'session' ? `${t('journal.box.session')}${e.sessionNo != null ? ' ' + e.sessionNo : ''}` : t('journal.box.note');
  return [head, dayMonth(e.date).toUpperCase(), timeOf(e.createdAt)].filter(Boolean).join(' · ');
}

/** Первая непустая строка текста (упоминания как имена) или последний фрагмент расшифровки. */
export function entryExcerpt(e: JournalEntry): string {
  const line = mentionsToNames(e.text)
    .split('\n')
    .map((s) => s.trim())
    .find(Boolean);
  if (line) return line;
  const seg = [...e.transcript].reverse().find((s) => s.text.trim());
  return seg ? seg.text.trim() : '';
}

/** Сортировка: по дате, затем номеру сессии, затем времени создания — новые первыми. */
export function compareEntries(a: JournalEntry, b: JournalEntry): number {
  return b.date.localeCompare(a.date) || (b.sessionNo ?? 0) - (a.sessionNo ?? 0) || b.createdAt.localeCompare(a.createdAt);
}

export type StatusTone = 'good' | 'bad' | 'gold' | 'plain';

export function statusPresets(kind: CodexKind): string[] {
  if (kind === 'npc') return ['alive', 'dead', 'unknown'].map((k) => t(`journal.status.npc.${k}`));
  if (kind === 'quest') return ['active', 'done', 'failed'].map((k) => t(`journal.status.quest.${k}`));
  return [];
}

export function statusTone(status: string): StatusTone {
  const s = status.trim().toLowerCase();
  if (!s) return 'plain';
  if (s === t('journal.status.npc.alive') || s === t('journal.status.quest.active') || s === 'активний') return 'good';
  if (s === t('journal.status.npc.dead') || s === t('journal.status.quest.failed')) return 'bad';
  if (s === t('journal.status.quest.done')) return 'gold';
  return 'plain';
}

export function codexInitial(c: CodexEntry): string {
  return (c.name.trim()[0] ?? KIND_GLYPH[c.kind]).toUpperCase();
}

/** Фрагмент вокруг найденного текста (для списка при поиске). */
export function searchSnippet(e: JournalEntry, q: string, radius = 40): string {
  const s = q.trim().toLowerCase();
  if (!s) return entryExcerpt(e);
  const sources = [mentionsToNames(e.text), ...e.transcript.map((x) => x.text)];
  for (const src of sources) {
    const flat = src.replace(/\s+/g, ' ');
    const i = flat.toLowerCase().indexOf(s);
    if (i >= 0) {
      const start = Math.max(0, i - radius);
      return (start > 0 ? '…' : '') + flat.slice(start, i + s.length + radius * 2);
    }
  }
  return entryExcerpt(e);
}
