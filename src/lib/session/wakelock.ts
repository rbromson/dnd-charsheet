/** Экран не гаснет, пока идёт запись (Screen Wake Lock API). */

export type WakeState = 'off' | 'on' | 'unsupported' | 'error';

export class ScreenWake {
  #sentinel: WakeLockSentinel | null = null;
  #wanted = false;
  state: WakeState = 'off';
  error = '';
  private onChange: (s: WakeState) => void;
  constructor(onChange: (s: WakeState) => void) {
    this.onChange = onChange;
  }

  static supported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  #set(s: WakeState) {
    this.state = s;
    this.onChange(s);
  }

  async acquire(): Promise<void> {
    this.#wanted = true;
    if (!ScreenWake.supported()) return this.#set('unsupported');
    if (this.#sentinel && !this.#sentinel.released) return this.#set('on');
    if (document.visibilityState !== 'visible') return; // повторим на visibilitychange
    try {
      const s = await navigator.wakeLock.request('screen');
      this.#sentinel = s;
      s.addEventListener('release', () => {
        if (this.#sentinel === s) this.#sentinel = null;
        // система снимает блокировку при сворачивании — вернём при возврате
        if (this.#wanted) this.#set('off');
      });
      this.error = '';
      this.#set('on');
    } catch (e) {
      this.error = (e as Error)?.message ?? String(e);
      this.#set('error');
    }
  }

  /** Вызывать при возврате на экран */
  async reacquire(): Promise<void> {
    if (this.#wanted) await this.acquire();
  }

  async release(): Promise<void> {
    this.#wanted = false;
    const s = this.#sentinel;
    this.#sentinel = null;
    try {
      await s?.release();
    } catch {
      /* уже снят */
    }
    this.#set('off');
  }
}
