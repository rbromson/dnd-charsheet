import type { CodexEntry, CodexKind } from '../model/types';
import { uid, nowIso } from '../model/ids';
import { byCharacter, putCodex, deleteFrom } from '../db';
import { charStore } from './characters.svelte';
import { journal } from './journal.svelte';
import { createListSaver } from './persist';
import { renameMentions, hasMention, snippetAround } from '../mentions';
import { ui } from './ui.svelte';
import { t } from '../i18n';

export const CODEX_KINDS: CodexKind[] = ['npc', 'place', 'quest'];

class CodexStore {
  items = $state<CodexEntry[]>([]);
  #saver = createListSaver<CodexEntry>(putCodex);
  #characterId = '';

  constructor() {
    $effect.root(() => {
      $effect(() => {
        this.#saver.schedule($state.snapshot(this.items) as CodexEntry[]);
      });
    });
    charStore.onSelect((id) => this.load(id));
  }

  async load(characterId: string) {
    await this.#saver.flush();
    const list = await byCharacter('codex', characterId);
    this.#saver.prime(list);
    this.#characterId = characterId;
    this.items = list;
  }

  flush() {
    return this.#saver.flush();
  }

  byKind(kind: CodexKind): CodexEntry[] {
    return this.items.filter((x) => x.kind === kind).sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  }

  get(id: string) {
    return this.items.find((x) => x.id === id);
  }

  byName(name: string) {
    const n = name.toLowerCase();
    return this.items.find((x) => x.name.toLowerCase() === n);
  }

  create(kind: CodexKind, name: string, init: Partial<CodexEntry> = {}): CodexEntry {
    const now = nowIso();
    const e: CodexEntry = {
      id: uid(),
      characterId: this.#characterId,
      kind,
      name: name.trim(),
      text: '',
      status: kind === 'quest' ? t('journal.status.quest.active') : '',
      secret: '',
      images: [],
      createdAt: now,
      updatedAt: now,
      ...init,
    };
    this.items.push(e);
    return this.items[this.items.length - 1];
  }

  /** Переименование правит упоминания @[Старое] во всём журнале и справочнике. */
  update(id: string, patch: Partial<CodexEntry>) {
    const e = this.get(id);
    if (!e) return;
    const oldName = e.name;
    Object.assign(e, patch, { updatedAt: nowIso() });
    if (patch.name !== undefined && patch.name !== oldName) {
      for (const j of journal.entries) {
        j.text = renameMentions(j.text, oldName, e.name);
        j.secret = renameMentions(j.secret, oldName, e.name);
      }
      for (const c of this.items) {
        c.text = renameMentions(c.text, oldName, e.name);
        c.secret = renameMentions(c.secret, oldName, e.name);
      }
    }
  }

  async remove(id: string) {
    const e = this.get(id);
    if (!e) return;
    const before = $state.snapshot(e) as CodexEntry;
    this.items = this.items.filter((x) => x.id !== id);
    this.#saver.forget(id);
    await deleteFrom('codex', id);
    ui.toast(t('common.deleted', { name: before.name }), () => {
      this.items.push(before);
    });
  }

  /** Записи журнала и карточки, где упоминается этот элемент. */
  mentionsOf(id: string): { kind: 'entry' | 'codex'; id: string; title: string; snippet: string }[] {
    const e = this.get(id);
    if (!e) return [];
    const out: { kind: 'entry' | 'codex'; id: string; title: string; snippet: string }[] = [];
    for (const j of journal.sorted) {
      const src = hasMention(j.text, e.name) ? j.text : hasMention(j.secret, e.name) ? j.secret : '';
      if (src) out.push({ kind: 'entry', id: j.id, title: j.title || (j.sessionNo ? `#${j.sessionNo}` : j.date), snippet: snippetAround(src, e.name) });
    }
    for (const c of this.items) {
      if (c.id !== id && hasMention(c.text, e.name)) out.push({ kind: 'codex', id: c.id, title: c.name, snippet: snippetAround(c.text, e.name) });
    }
    return out;
  }
}

export const codex = new CodexStore();
