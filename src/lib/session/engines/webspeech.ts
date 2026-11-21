/**
 * Распознавание через Web Speech API Chrome (онлайн, сервер Google).
 * Сам перезапускается после 'end', пока активен; с нарастающей паузой,
 * если сессии распознавания обрываются сразу (чтобы не крутиться в цикле).
 * gate() решает, перезапускать ли прямо сейчас (на Android каждый старт — звуковой сигнал,
 * поэтому в тишине можно не перезапускать, а дождаться kick() от детектора речи).
 */

export type SpeechErrorCode = 'unsupported' | 'not-allowed' | 'network' | 'audio-capture' | 'language' | 'other';

interface SRAlternative {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  length: number;
  [i: number]: SRAlternative;
}
interface SRResultEvent extends Event {
  resultIndex: number;
  results: { length: number; [i: number]: SRResult };
}
interface SRErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SR extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SRResultEvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SRCtor = new () => SR;

function ctor(): SRCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface WebSpeechCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  /** fatal — распознавание остановлено и само не продолжится */
  onError: (code: SpeechErrorCode, fatal: boolean, detail: string) => void;
  onRunning: (running: boolean) => void;
}

export class WebSpeechEngine {
  #rec: SR | null = null;
  #active = false;
  #running = false;
  #lang = 'uk-UA';
  #startedAt = 0;
  #delay = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #lastFinal = '';
  #cb: WebSpeechCallbacks;
  /** Перезапускать ли сейчас; по умолчанию — всегда */
  gate: () => boolean = () => true;
  restarts = 0;

  constructor(cb: WebSpeechCallbacks) {
    this.#cb = cb;
  }

  static supported(): boolean {
    return ctor() !== null;
  }

  get running() {
    return this.#running;
  }

  start(lang: string) {
    const C = ctor();
    if (!C) {
      this.#cb.onError('unsupported', true, '');
      return;
    }
    this.#lang = lang;
    this.#active = true;
    this.#delay = 0;
    this.#spawn();
  }

  stop() {
    this.#active = false;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    const r = this.#rec;
    this.#rec = null;
    if (r) {
      r.onend = null;
      r.onresult = null;
      r.onerror = null;
      try {
        r.stop();
      } catch {
        /* не запущен */
      }
    }
    this.#setRunning(false);
    this.#cb.onInterim('');
  }

  /** Есть звук — убедиться, что распознавание идёт. */
  kick() {
    if (!this.#active || this.#running || this.#timer) return;
    this.#spawn();
  }

  #setRunning(v: boolean) {
    if (this.#running !== v) {
      this.#running = v;
      this.#cb.onRunning(v);
    }
  }

  #spawn() {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    if (!this.#active) return;
    const C = ctor()!;
    const r = new C();
    r.lang = this.#lang;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    this.#lastFinal = '';
    r.onstart = () => this.#setRunning(true);
    r.onresult = (e) => this.#onResult(e);
    r.onerror = (e) => this.#onError(e);
    r.onend = () => this.#onEnd(r);
    this.#rec = r;
    this.#startedAt = Date.now();
    try {
      r.start();
      this.restarts++;
    } catch (e) {
      this.#rec = null;
      this.#schedule();
      this.#cb.onError('other', false, (e as Error)?.message ?? String(e));
    }
  }

  #onResult(e: SRResultEvent) {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const text = (res[0]?.transcript ?? '').trim();
      if (!text) continue;
      if (res.isFinal) {
        // Chrome на Android иногда повторяет прежний итог в начале нового — отрезаем
        let fresh = text;
        if (this.#lastFinal && text.toLowerCase().startsWith(this.#lastFinal.toLowerCase())) {
          fresh = text.slice(this.#lastFinal.length).trim();
        }
        this.#lastFinal = text;
        if (fresh) this.#cb.onFinal(fresh);
        this.#delay = 0;
      } else {
        interim += (interim ? ' ' : '') + text;
      }
    }
    this.#cb.onInterim(interim);
  }

  #onError(e: SRErrorEvent) {
    const err = e.error;
    if (err === 'no-speech' || err === 'aborted') return; // обычная тишина / наш stop()
    if (err === 'not-allowed' || err === 'service-not-allowed') {
      this.#active = false;
      this.#cb.onError('not-allowed', true, err);
    } else if (err === 'language-not-supported') {
      this.#active = false;
      this.#cb.onError('language', true, err);
    } else if (err === 'network') {
      this.#delay = Math.max(this.#delay, 3000);
      this.#cb.onError('network', false, e.message || err);
    } else if (err === 'audio-capture') {
      this.#cb.onError('audio-capture', false, e.message || err);
    } else {
      this.#cb.onError('other', false, `${err} ${e.message ?? ''}`.trim());
    }
  }

  #onEnd(r: SR) {
    if (this.#rec !== r) return;
    this.#rec = null;
    this.#setRunning(false);
    this.#cb.onInterim('');
    if (!this.#active) return;
    // быстрые обрывы → пауза растёт до 5 с
    if (Date.now() - this.#startedAt < 1500) this.#delay = Math.min(5000, Math.max(300, this.#delay * 2));
    if (this.gate()) this.#schedule();
  }

  #schedule() {
    if (!this.#active || this.#timer) return;
    this.#timer = setTimeout(() => {
      this.#timer = null;
      if (this.#active && !this.#running && this.gate()) this.#spawn();
    }, this.#delay);
  }
}
