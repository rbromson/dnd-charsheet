import type { Character, CharacterSummary } from '../model/types';
import { newCharacter } from '../model/defaults';
import { normalizeCharacter } from '../model/normalize';
import { uid, nowIso } from '../model/ids';
import { allCharacters, putCharacter, deleteCharacterCascade, getMeta, setMeta, byCharacter, putMediaRecord, db } from '../db';
import { ui } from './ui.svelte';
import { t } from '../i18n';

type SelectListener = (characterId: string) => Promise<void> | void;

function summary(c: Character): CharacterSummary {
  return {
    id: c.id,
    name: c.name,
    className: c.className,
    level: c.level,
    portraitId: c.portraitId,
    hp: { max: c.hp.max, current: c.hp.current },
    updatedAt: c.updatedAt,
  };
}

class CharStore {
  list = $state<CharacterSummary[]>([]);
  current = $state<Character | null>(null);
  ready = $state(false);

  #lastSaved = '';
  #timer: ReturnType<typeof setTimeout> | null = null;
  #listeners: SelectListener[] = [];

  constructor() {
    $effect.root(() => {
      $effect(() => {
        if (!this.current) return;
        const json = JSON.stringify($state.snapshot(this.current));
        if (json === this.#lastSaved) return;
        this.#schedule(json);
      });
    });
  }

  /** Подписка на смену персонажа (журнал, справочник). */
  onSelect(fn: SelectListener) {
    this.#listeners.push(fn);
  }

  #schedule(json: string) {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#save(json), 400);
  }

  async #save(json: string) {
    this.#timer = null;
    const c = JSON.parse(json) as Character;
    c.updatedAt = nowIso();
    this.#lastSaved = json;
    await putCharacter(c);
    const i = this.list.findIndex((x) => x.id === c.id);
    const s = summary(c);
    if (i >= 0) this.list[i] = s;
    else this.list.push(s);
  }

  async flush() {
    if (this.#timer && this.current) {
      clearTimeout(this.#timer);
      await this.#save(JSON.stringify($state.snapshot(this.current)));
    }
  }

  async load() {
    // по умолчанию персонажей нет: пустой экран с «Новий персонаж» и «Імпорт»
    const chars = await allCharacters();
    this.list = chars.map(summary).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (chars.length) {
      const lastId = await getMeta<string | null>('currentId', null);
      await this.select(chars.some((c) => c.id === lastId) ? lastId! : this.list[0].id);
    }
    this.ready = true;
  }

  async select(id: string) {
    await this.flush();
    const raw = (await db()).get('characters', id);
    const c = normalizeCharacter(await raw);
    this.#lastSaved = JSON.stringify(c);
    this.current = c;
    await setMeta('currentId', id);
    for (const fn of this.#listeners) await fn(id);
  }

  /**
   * Изменение листа. Для заметных действий передайте undo — появится тост «Скасувати».
   * Простые правки полей можно делать и через bind: — автосохранение увидит их.
   */
  update(fn: (c: Character) => void, opts: { undo?: string } = {}) {
    const c = this.current;
    if (!c) return;
    if (opts.undo) {
      const before = $state.snapshot(c) as Character;
      fn(c);
      ui.toast(opts.undo, () => {
        if (this.current?.id === before.id) this.current = before;
      });
    } else {
      fn(c);
    }
  }

  async create() {
    const c = newCharacter();
    c.name = t('chars.newName');
    await putCharacter(c);
    this.list.unshift(summary(c));
    await this.select(c.id);
    ui.mode = 'edit';
  }

  async duplicate(id: string) {
    await this.flush();
    const src = normalizeCharacter(await (await db()).get('characters', id));
    const copy = normalizeCharacter(JSON.parse(JSON.stringify(src)));
    copy.id = uid();
    copy.name = `${src.name} ${t('chars.copySuffix')}`.trim();
    copy.createdAt = copy.updatedAt = nowIso();
    // копируем картинки, на которые ссылается лист
    const media = await byCharacter('media', id);
    const idMap = new Map<string, string>();
    for (const m of media) {
      if (m.kind !== 'image') continue;
      if (m.id !== src.portraitId && !src.gallery.includes(m.id)) continue;
      const nid = uid();
      idMap.set(m.id, nid);
      await putMediaRecord({ ...m, id: nid, characterId: copy.id });
    }
    copy.portraitId = src.portraitId ? (idMap.get(src.portraitId) ?? null) : null;
    copy.gallery = src.gallery.map((g) => idMap.get(g)).filter((x): x is string => !!x);
    await putCharacter(copy);
    this.list.unshift(summary(copy));
    await this.select(copy.id);
  }

  async remove(id: string) {
    await deleteCharacterCascade(id);
    this.list = this.list.filter((x) => x.id !== id);
    if (this.current?.id === id) {
      this.current = null;
      if (this.list.length) await this.select(this.list[0].id);
      else await setMeta('currentId', null);
    }
  }

  /** После импорта: добавить в список и открыть. */
  async adopt(c: Character) {
    this.list.unshift(summary(c));
    await this.select(c.id);
  }
}

export const charStore = new CharStore();
