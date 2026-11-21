/** Дебаунс-сохранение изменённых элементов списка (сравнение по JSON). */
export function createListSaver<T extends { id: string }>(save: (item: T) => Promise<void>, delay = 400) {
  const saved = new Map<string, string>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T[] = [];

  async function flush() {
    if (timer) clearTimeout(timer);
    timer = null;
    const items = pending;
    pending = [];
    for (const it of items) {
      const json = JSON.stringify(it);
      if (saved.get(it.id) === json) continue;
      saved.set(it.id, json);
      await save(it);
    }
  }

  return {
    /** Пометить текущее содержимое как сохранённое (после загрузки из БД). */
    prime(items: T[]) {
      saved.clear();
      for (const it of items) saved.set(it.id, JSON.stringify(it));
    },
    schedule(items: T[]) {
      pending = items;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, delay);
    },
    forget(id: string) {
      saved.delete(id);
    },
    flush,
  };
}
