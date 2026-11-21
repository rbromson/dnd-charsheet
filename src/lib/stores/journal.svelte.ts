import type { EntryKind, JournalEntry, TranscriptSegment } from '../model/types';
import { uid, nowIso, todayDate } from '../model/ids';
import { byCharacter, putJournal, deleteFrom } from '../db';
import { charStore } from './characters.svelte';
import { createListSaver } from './persist';
import { ui } from './ui.svelte';
import { t } from '../i18n';
import { deleteMedia } from './media';

class JournalStore {
  entries = $state<JournalEntry[]>([]);
  characterId = $state('');
  #saver = createListSaver<JournalEntry>(putJournal);

  constructor() {
    $effect.root(() => {
      $effect(() => {
        const snap = $state.snapshot(this.entries) as JournalEntry[];
        this.#saver.schedule(snap);
      });
    });
    charStore.onSelect((id) => this.load(id));
  }

  async load(characterId: string) {
    await this.#saver.flush();
    const list = await byCharacter('journal', characterId);
    this.#saver.prime(list);
    this.characterId = characterId;
    this.entries = list;
  }

  flush() {
    return this.#saver.flush();
  }

  /** Закреплённые сверху, затем по номеру сессии / дате создания, новые первыми. */
  get sorted(): JournalEntry[] {
    return [...this.entries].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  get nextSessionNo(): number {
    return this.entries.reduce((m, e) => Math.max(m, e.sessionNo ?? 0), 0) + 1;
  }

  get(id: string) {
    return this.entries.find((e) => e.id === id);
  }

  create(kind: EntryKind = 'session', init: Partial<JournalEntry> = {}): JournalEntry {
    const now = nowIso();
    const e: JournalEntry = {
      id: uid(),
      characterId: this.characterId,
      kind,
      sessionNo: kind === 'session' ? this.nextSessionNo : null,
      date: todayDate(),
      title: '',
      text: '',
      secret: '',
      pinned: false,
      images: [],
      transcript: [],
      createdAt: now,
      updatedAt: now,
      ...init,
    };
    this.entries.push(e);
    return this.entries[this.entries.length - 1];
  }

  /** Последняя сессия; если её нет или она не сегодняшняя — создаётся новая. */
  currentSession(): JournalEntry {
    const sessions = this.entries.filter((e) => e.kind === 'session').sort((a, b) => (b.sessionNo ?? 0) - (a.sessionNo ?? 0));
    const last = sessions[0];
    if (last && last.date === todayDate()) return last;
    return this.create('session');
  }

  update(id: string, patch: Partial<JournalEntry>) {
    const e = this.get(id);
    if (!e) return;
    Object.assign(e, patch, { updatedAt: nowIso() });
  }

  async remove(id: string) {
    const e = this.get(id);
    if (!e) return;
    const before = $state.snapshot(e) as JournalEntry;
    this.entries = this.entries.filter((x) => x.id !== id);
    this.#saver.forget(id);
    await deleteFrom('journal', id);
    ui.toast(t('common.deleted', { name: before.title || `#${before.sessionNo ?? ''}` }), () => {
      this.entries.push(before);
    });
  }

  /** Окончательно удалить медиа записи (вызывать, если пользователь не отменил). */
  async purgeMedia(entry: JournalEntry) {
    for (const id of entry.images) await deleteMedia(id);
    for (const s of entry.transcript) if (s.audioId) await deleteMedia(s.audioId);
  }

  appendSegment(entryId: string, seg: TranscriptSegment) {
    const e = this.get(entryId);
    if (!e) return;
    e.transcript.push(seg);
    e.updatedAt = nowIso();
  }

  updateSegment(entryId: string, segId: string, patch: Partial<TranscriptSegment>) {
    const s = this.get(entryId)?.transcript.find((x) => x.id === segId);
    if (s) Object.assign(s, patch);
  }

  /** Быстрая заметка: дописывается в текст текущей сессии с отметкой времени. */
  quickNote(text: string): JournalEntry {
    const e = this.currentSession();
    const time = new Date().toTimeString().slice(0, 5);
    const line = `[${time}] ${text.trim()}`;
    e.text = e.text ? `${e.text}\n${line}` : line;
    e.updatedAt = nowIso();
    return e;
  }

  search(q: string): JournalEntry[] {
    const s = q.trim().toLowerCase();
    if (!s) return this.sorted;
    return this.sorted.filter((e) =>
      [e.title, e.text, ...e.transcript.map((x) => x.text)].some((x) => x.toLowerCase().includes(s)),
    );
  }
}

export const journal = new JournalStore();
