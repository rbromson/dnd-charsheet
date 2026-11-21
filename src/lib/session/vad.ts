/**
 * Простой детектор речи по громкости (энергетический VAD).
 * Чистая логика без браузерных API — тестируется в vad.test.ts.
 *
 * Звук режется на окна по windowMs; громкость окна — RMS в dBFS.
 * Фрагмент начинается, когда окна громче порога набрали minSpeechMs
 * (короткие щелчки/стук отбрасываются, событие 'start' не приходит вовсе),
 * и закрывается после hangoverMs тишины. К началу добавляется предзапись
 * (prerollMs), чтобы первые слоги не обрезались; к концу — tailMs.
 * Слишком длинные фрагменты делятся: после (maxSegmentMs − softSplitMs)
 * — на первой паузе, на maxSegmentMs — принудительно.
 */

export interface VadOptions {
  sampleRate: number;
  /** Порог в dBFS (обычно −70…−10) */
  thresholdDb: number;
  hangoverMs?: number;
  prerollMs?: number;
  /** Сколько «громкого» звука нужно, чтобы считать это речью */
  minSpeechMs?: number;
  maxSegmentMs?: number;
  /** За сколько до maxSegmentMs начинать искать паузу для разреза */
  softSplitMs?: number;
  /** Сколько тишины оставить в конце фрагмента */
  tailMs?: number;
  windowMs?: number;
}

export type VadEvent =
  | { type: 'level'; db: number }
  | { type: 'start'; startedAt: number }
  | { type: 'end'; samples: Float32Array; startedAt: number; durationMs: number };

export const MIN_DB = -90;

export function rmsToDb(rms: number): number {
  if (rms <= 0) return MIN_DB;
  return Math.max(MIN_DB, 20 * Math.log10(rms));
}

export function rms(frame: Float32Array, from = 0, to = frame.length): number {
  let sum = 0;
  for (let i = from; i < to; i++) sum += frame[i] * frame[i];
  const n = to - from;
  return n > 0 ? Math.sqrt(sum / n) : 0;
}

/** Ползунок 0…100 ↔ dBFS −70…−10 (шкала уровня в интерфейсе та же). */
export const SLIDER_MIN_DB = -70;
export const SLIDER_MAX_DB = -10;
export function sliderToDb(v: number): number {
  return SLIDER_MIN_DB + (Math.min(100, Math.max(0, v)) / 100) * (SLIDER_MAX_DB - SLIDER_MIN_DB);
}
export function dbToSlider(db: number): number {
  return Math.min(100, Math.max(0, ((db - SLIDER_MIN_DB) / (SLIDER_MAX_DB - SLIDER_MIN_DB)) * 100));
}

type State = 'silence' | 'candidate' | 'speech';

export class VadSegmenter {
  readonly sampleRate: number;
  thresholdDb: number;
  readonly hangoverMs: number;
  readonly prerollMs: number;
  readonly minSpeechMs: number;
  readonly maxSegmentMs: number;
  readonly softSplitMs: number;
  readonly tailMs: number;
  readonly windowSize: number;

  #state: State = 'silence';
  /** Незаконченное окно */
  #pending: Float32Array;
  #pendingLen = 0;
  /** Всего обработано сэмплов (по окнам) */
  #pos = 0;
  /** Предзапись: последние окна в тишине */
  #preroll: Float32Array[] = [];
  #prerollWindows: number;
  /** Окна текущего фрагмента */
  #seg: Float32Array[] = [];
  #segStart = 0; // в сэмплах
  #loudWindows = 0;
  #quietRun = 0; // окон тишины подряд

  constructor(o: VadOptions) {
    this.sampleRate = o.sampleRate;
    this.thresholdDb = o.thresholdDb;
    this.hangoverMs = o.hangoverMs ?? 1500;
    this.prerollMs = o.prerollMs ?? 500;
    this.minSpeechMs = o.minSpeechMs ?? 300;
    this.maxSegmentMs = o.maxSegmentMs ?? 30000;
    this.softSplitMs = o.softSplitMs ?? 6000;
    this.tailMs = o.tailMs ?? 300;
    this.windowSize = Math.max(1, Math.round((this.sampleRate * (o.windowMs ?? 30)) / 1000));
    this.#pending = new Float32Array(this.windowSize);
    this.#prerollWindows = Math.ceil(this.prerollMs / this.#winMs());
  }

  /** Сколько звука уже обработано, мс */
  get positionMs(): number {
    return this.#ms(this.#pos);
  }

  get inSpeech(): boolean {
    return this.#state === 'speech';
  }

  #winMs() {
    return (this.windowSize / this.sampleRate) * 1000;
  }
  #ms(samples: number) {
    return (samples / this.sampleRate) * 1000;
  }

  /** Подать кусок звука любой длины. Возвращает события по порядку. */
  push(frame: Float32Array): VadEvent[] {
    const events: VadEvent[] = [];
    let maxDb = MIN_DB;
    let i = 0;
    while (i < frame.length) {
      const take = Math.min(this.windowSize - this.#pendingLen, frame.length - i);
      this.#pending.set(frame.subarray(i, i + take), this.#pendingLen);
      this.#pendingLen += take;
      i += take;
      if (this.#pendingLen === this.windowSize) {
        const win = this.#pending;
        this.#pending = new Float32Array(this.windowSize);
        this.#pendingLen = 0;
        const db = rmsToDb(rms(win));
        if (db > maxDb) maxDb = db;
        this.#window(win, db, events);
      }
    }
    events.unshift({ type: 'level', db: maxDb });
    return events;
  }

  /** Закрыть текущий фрагмент (при остановке записи). */
  flush(): VadEvent[] {
    const events: VadEvent[] = [];
    if (this.#state === 'speech') this.#end(events, this.#seg.length);
    this.#reset();
    return events;
  }

  #reset() {
    this.#state = 'silence';
    this.#seg = [];
    this.#loudWindows = 0;
    this.#quietRun = 0;
  }

  #window(win: Float32Array, db: number, events: VadEvent[]) {
    const winStart = this.#pos;
    this.#pos += win.length;
    const winMs = this.#winMs();

    if (this.#state === 'silence') {
      if (db >= this.thresholdDb) {
        this.#seg = [...this.#preroll, win];
        this.#segStart = winStart - this.#preroll.length * this.windowSize;
        this.#preroll = [];
        this.#loudWindows = 1;
        this.#quietRun = 0;
        this.#state = 'candidate';
        this.#maybeConfirm(events);
      } else {
        this.#preroll.push(win);
        if (this.#preroll.length > this.#prerollWindows) this.#preroll.shift();
      }
      return;
    }

    // candidate / speech
    this.#seg.push(win);
    // гистерезис: внутри фрагмента порог чуть ниже, чтобы не рвать тихие слоги
    const loud = db >= this.thresholdDb - 6;
    if (loud) {
      this.#loudWindows++;
      this.#quietRun = 0;
    } else {
      this.#quietRun++;
    }

    if (this.#state === 'candidate') {
      if (this.#maybeConfirm(events)) return;
      if (this.#quietRun * winMs >= this.hangoverMs) {
        // так и не набрали речи — это был щелчок/стук, выбрасываем
        const tailKeep = this.#seg.slice(-this.#prerollWindows);
        this.#reset();
        this.#preroll = tailKeep;
      }
      return;
    }

    // speech
    const segMs = this.#seg.length * winMs;
    if (this.#quietRun * winMs >= this.hangoverMs) {
      const keepQuiet = Math.ceil(this.tailMs / winMs);
      const cut = this.#seg.length - this.#quietRun + Math.min(keepQuiet, this.#quietRun);
      const rest = this.#seg.slice(cut);
      this.#end(events, cut);
      this.#reset();
      this.#preroll = rest.slice(-this.#prerollWindows);
      return;
    }
    const softSplit = segMs >= this.maxSegmentMs - this.softSplitMs && !loud;
    if (segMs >= this.maxSegmentMs || softSplit) {
      // режем здесь; продолжение станет новым фрагментом, если речь не кончилась
      this.#end(events, this.#seg.length);
      this.#seg = [];
      this.#segStart = this.#pos;
      this.#loudWindows = 0;
      this.#quietRun = 0;
      this.#state = 'candidate';
    }
  }

  #maybeConfirm(events: VadEvent[]): boolean {
    if (this.#loudWindows * this.#winMs() >= this.minSpeechMs) {
      this.#state = 'speech';
      events.push({ type: 'start', startedAt: this.#ms(this.#segStart) });
      return true;
    }
    return false;
  }

  #end(events: VadEvent[], windows: number) {
    const parts = this.#seg.slice(0, windows);
    const len = parts.reduce((s, p) => s + p.length, 0);
    if (len === 0) return;
    const samples = new Float32Array(len);
    let o = 0;
    for (const p of parts) {
      samples.set(p, o);
      o += p.length;
    }
    events.push({ type: 'end', samples, startedAt: this.#ms(this.#segStart), durationMs: this.#ms(len) });
  }
}
