import type { CodexKind } from '../../lib/model/types';

export type JournalTab = 'sessions' | CodexKind;
export type Sel = { kind: 'entry' | 'codex'; id: string };

/** Состояние экрана журнала: переживает переключение вкладок навигации. */
class JournalViewState {
  tab = $state<JournalTab>('sessions');
  q = $state('');
  /** Что открыто в центре */
  sel = $state<Sel | null>(null);
  /** Карточка справочника справа (широкий экран) */
  side = $state<string | null>(null);
  /** Узкий экран: показывать список вместо записи */
  showList = $state(false);
  /** Только что созданный элемент — открыть сразу в правке */
  freshId = $state<string | null>(null);
  /** Для какого персонажа уже выбрана «последняя сессия» при первом открытии */
  initFor = '';
}

export const jv = new JournalViewState();
