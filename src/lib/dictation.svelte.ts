/**
 * Голосовой ввод в текстовые поля (диктовка) через Web Speech API Chrome.
 * Один активный диктант на всё приложение. Язык — из настроек режима сессии.
 */
import { loadSettings, LANGS } from './session/settings';
import { recorder } from './session/recorder.svelte';

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export type DictationError = 'unsupported' | 'busy' | 'denied' | 'network' | 'nospeech' | 'other';

function ctor(): (new () => Rec) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

class Dictation {
  /** id поля, которое сейчас диктуется */
  owner = $state<string | null>(null);
  interim = $state('');
  error = $state<DictationError | null>(null);

  #rec: Rec | null = null;
  #onFinal: ((text: string) => void) | null = null;
  #userStopped = false;
  #restarts = 0;

  supported(): boolean {
    return typeof window !== 'undefined' && !!ctor();
  }

  /** Режим сессии с движком Chrome уже держит распознавание — второе Chrome не даст. */
  get busyWithSession(): boolean {
    return recorder.status !== 'idle' && recorder.engine === 'webspeech';
  }

  async start(owner: string, onFinal: (text: string) => void) {
    this.stop();
    this.error = null;
    const C = ctor();
    if (!C) {
      this.error = 'unsupported';
      return;
    }
    if (this.busyWithSession) {
      this.error = 'busy';
      return;
    }
    const s = recorder.settingsLoaded ? recorder.settings : await loadSettings();
    const rec = new C();
    rec.lang = LANGS[s.language].speech;
    rec.continuous = true;
    rec.interimResults = true;
    this.#rec = rec;
    this.#onFinal = onFinal;
    this.#userStopped = false;
    this.#restarts = 0;
    this.owner = owner;
    this.interim = '';

    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const txt: string = r[0]?.transcript ?? '';
        if (r.isFinal) {
          const clean = txt.trim();
          if (clean) this.#onFinal?.(clean);
        } else interim += txt;
      }
      this.interim = interim.trim();
    };
    rec.onerror = (e: any) => {
      const code: string = e?.error ?? '';
      if (code === 'not-allowed' || code === 'service-not-allowed') this.error = 'denied';
      else if (code === 'network') this.error = 'network';
      else if (code === 'no-speech') return; // тишина — просто перезапустимся в onend
      else if (code === 'aborted') return;
      else if (code === 'audio-capture') this.error = this.busyWithSession ? 'busy' : 'other';
      else this.error = 'other';
      this.#userStopped = true;
    };
    rec.onend = () => {
      // Chrome на Android завершает распознавание после паузы — продолжаем, пока пользователь не нажал «стоп»
      if (!this.#userStopped && this.#rec === rec && this.#restarts < 30) {
        this.#restarts++;
        try {
          rec.start();
          return;
        } catch {
          /* упало — закрываемся */
        }
      }
      if (this.#rec === rec) this.#reset();
    };
    try {
      rec.start();
    } catch {
      this.error = 'other';
      this.#reset();
    }
  }

  stop() {
    if (!this.#rec) return;
    this.#userStopped = true;
    try {
      this.#rec.stop();
    } catch {
      /* */
    }
    // финальный результат может прийти после stop(); onend сам всё сбросит
    const rec = this.#rec;
    setTimeout(() => {
      if (this.#rec === rec) this.#reset();
    }, 1500);
  }

  #reset() {
    this.#rec = null;
    this.#onFinal = null;
    this.owner = null;
    this.interim = '';
  }
}

export const dictation = new Dictation();

/** Вставка продиктованной фразы в текст на позицию каретки, с пробелом и заглавной буквой в начале предложения. */
export function insertDictated(text: string, start: number, end: number, phrase: string): { text: string; caret: number } {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const sentenceStart = before.trim() === '' || /[.!?…]\s*$/.test(before) || /\n\s*$/.test(before);
  let p = phrase.trim();
  if (sentenceStart && p) p = p[0].toUpperCase() + p.slice(1);
  const lead = before && !/[\s(«"'\n]$/.test(before) ? ' ' : '';
  const trail = after && !/^[\s.,!?;:)»]/.test(after) ? ' ' : '';
  const out = before + lead + p + trail + after;
  return { text: out, caret: (before + lead + p).length };
}
