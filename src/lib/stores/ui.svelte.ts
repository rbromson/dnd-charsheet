import type { Component } from 'svelte';

export type TabKey = 'sheet' | 'combat' | 'spells' | 'gear' | 'profile' | 'journal';

export interface ToastItem {
  id: number;
  message: string;
  undo?: () => void;
  /** Подпись кнопки действия (по умолчанию «Скасувати») */
  actionLabel?: string;
}

export interface ConfirmState {
  message: string;
  okLabel?: string;
  danger?: boolean;
  /** Доп. строки (например, что восстановится на отдыхе) */
  details?: string[];
  resolve: (ok: boolean) => void;
}

let toastSeq = 0;

class UiStore {
  mode = $state<'play' | 'edit'>('play');
  tab = $state<TabKey>('sheet');
  toasts = $state<ToastItem[]>([]);
  /** Боковая карточка (настройки элемента, редактор записи и т.п.) */
  sheet = $state<{ component: Component<any>; props: Record<string, unknown> } | null>(null);
  confirmState = $state<ConfirmState | null>(null);
  switcherOpen = $state(false);
  quickNoteOpen = $state(false);
  diceTrayOpen = $state(false);
  /** Лоток «Привал» (короткий / довгий відпочинок) */
  restOpen = $state(false);
  /** Обучение (показывается при первом запуске, повтор — из панели персонажей) */
  tutorialOpen = $state(false);
  /** Открытая запись журнала / справочника (для перехода из других экранов) */
  journalFocus = $state<{ kind: 'entry' | 'codex'; id: string } | null>(null);

  get editing() {
    return this.mode === 'edit';
  }

  toast(message: string, undo?: () => void, ms = 5000, actionLabel?: string) {
    const item = { id: ++toastSeq, message, undo, actionLabel };
    this.toasts = [...this.toasts.slice(-2), item];
    setTimeout(() => this.dismiss(item.id), ms);
  }
  dismiss(id: number) {
    this.toasts = this.toasts.filter((x) => x.id !== id);
  }

  openSheet<P extends Record<string, any>>(component: Component<P>, props: P = {} as P) {
    this.sheet = { component: component as Component<any>, props };
  }
  closeSheet() {
    this.sheet = null;
  }

  confirm(message: string, opts: { okLabel?: string; danger?: boolean; details?: string[] } = {}): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmState = {
        message,
        ...opts,
        resolve: (ok) => {
          this.confirmState = null;
          resolve(ok);
        },
      };
    });
  }

  go(tab: TabKey) {
    this.tab = tab;
  }
}

export const ui = new UiStore();

/** Короткая вибрация, если устройство умеет. */
export function buzz(pattern: number | number[] = 15) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* нет вибрации */
  }
}
