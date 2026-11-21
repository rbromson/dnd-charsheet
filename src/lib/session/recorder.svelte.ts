/**
 * Запись сессии — одна на всё приложение. Состояние живёт здесь, а не в компоненте:
 * уход с экрана журнала запись не останавливает, панель просто подключается заново.
 *
 * Поток: микрофон (capture) → VAD → фрагмент → журнал (сразу, статус pending) →
 *   whisper: аудио в IndexedDB → очередь → текст;
 *   webspeech: текст от Chrome приклеивается к текущему/только что закрытому фрагменту;
 *   none: только аудио.
 */
import { SvelteMap } from 'svelte/reactivity';
import type { JournalEntry, TranscriptSegment } from '../model/types';
import { uid } from '../model/ids';
import { journal } from '../stores/journal.svelte';
import { putMedia, getMediaBlob, deleteMedia } from '../stores/media';
import { ui } from '../stores/ui.svelte';
import { t } from '../i18n';
import { MicCapture, CaptureError, type CaptureErrorCode } from './capture';
import { VadSegmenter, sliderToDb, dbToSlider, MIN_DB, type VadEvent } from './vad';
import { encodeWav, decodeWav, resample, WHISPER_RATE } from './wav';
import { ScreenWake, type WakeState } from './wakelock';
import { WebSpeechEngine, type SpeechErrorCode } from './engines/webspeech';
import { whisper } from './engines/whisper.svelte';
import { cleanTranscript } from './text';
import { DEFAULT_SETTINGS, LANGS, loadSettings, saveSettings, type EngineId, type SessionSettings } from './settings';

export type IssueCode =
  | CaptureErrorCode
  | 'mic-lost'
  | 'speech-unsupported'
  | 'speech-denied'
  | 'speech-network'
  | 'speech-language'
  | 'speech-audio-capture'
  | 'speech-other'
  | 'whisper-load'
  | 'save-failed'
  | 'entry-missing'
  | 'wakelock';

export interface Issue {
  id: number;
  code: IssueCode;
  detail: string;
  at: number;
}

export interface Gap {
  from: number;
  to: number;
  /** true — звук точно не шёл; false — экран гас, распознавание могло пропустить речь */
  certain: boolean;
}

interface Job {
  entryId: string;
  segId: string;
  audioId: string | null;
  audio: Float32Array | null;
  /** аудио сохранено только как очередь — удалить после распознавания */
  temp: boolean;
}

/** Каким способом реально идёт запись сейчас */
export type RunMode = 'capture' | 'capture+whisper' | 'webspeech+capture' | 'webspeech-only';

const SPEECH_GRACE_MS = 4000;
const GATE_KEEP_MS = 8000;

let issueSeq = 0;

class SessionRecorder {
  settings = $state<SessionSettings>({ ...DEFAULT_SETTINGS });
  settingsLoaded = $state(false);

  status = $state<'idle' | 'starting' | 'recording'>('idle');
  entryId = $state<string | null>(null);
  /** движок, с которым запущена текущая запись */
  engine = $state<EngineId>('none');
  startedAt = $state(0);
  now = $state(Date.now());
  levelDb = $state(MIN_DB);
  noiseDb = $state(MIN_DB);
  vadSpeech = $state(false);
  captureOn = $state(false);
  speechOn = $state(false);
  interim = $state('');
  segCount = $state(0);
  currentSegId = $state<string | null>(null);
  issues = $state<Issue[]>([]);
  gaps = $state<Gap[]>([]);
  wake = $state<WakeState>('off');
  queue = $state.raw<Job[]>([]);
  busySegId = $state<string | null>(null);
  /** ошибки распознавания по фрагментам (в модели данных места нет) */
  segErrors = new SvelteMap<string, string>();
  /** сколько мс заняло распознавание фрагмента */
  segTimes = new SvelteMap<string, number>();

  #capture = new MicCapture();
  #vad: VadSegmenter | null = null;
  #speech: WebSpeechEngine | null = null;
  #wakeLock = new ScreenWake((s) => (this.wake = s));
  #characterId = '';
  #lastFrameWall = 0;
  #lastSpeechEndAt = 0;
  #lastEndedSegId: string | null = null;
  #hiddenAt = 0;
  #ticker: ReturnType<typeof setInterval> | null = null;
  #lastCaptureRestart = 0;
  #pumping = false;
  #saveTimer: ReturnType<typeof setTimeout> | null = null;
  #settingsPromise: Promise<void> | null = null;

  constructor() {
    $effect.root(() => {
      // смена персонажа во время записи — останавливаемся, чтобы не писать «в никуда»
      $effect(() => {
        const cid = journal.characterId;
        if (this.status === 'recording' && this.#characterId && cid && cid !== this.#characterId) {
          this.issue('entry-missing');
          void this.stop();
        }
      });
    });
  }

  // ---------- настройки ----------

  ensureSettings(): Promise<void> {
    if (!this.#settingsPromise) {
      this.#settingsPromise = loadSettings().then((s) => {
        this.settings = s;
        this.settingsLoaded = true;
      });
    }
    return this.#settingsPromise;
  }

  update(patch: Partial<SessionSettings>) {
    Object.assign(this.settings, patch);
    if (patch.threshold !== undefined && this.#vad) this.#vad.thresholdDb = sliderToDb(patch.threshold);
    if (this.#saveTimer) clearTimeout(this.#saveTimer);
    this.#saveTimer = setTimeout(() => {
      void saveSettings($state.snapshot(this.settings) as SessionSettings).catch(() => {});
    }, 300);
  }

  /** Порог = шум + 12 дБ */
  autoThreshold() {
    if (this.noiseDb <= MIN_DB + 1) return;
    this.update({ threshold: Math.round(dbToSlider(this.noiseDb + 12)) });
  }

  // ---------- проблемы ----------

  issue(code: IssueCode, detail = '') {
    const existing = this.issues.find((i) => i.code === code);
    if (existing) {
      existing.detail = detail;
      existing.at = Date.now();
      return;
    }
    this.issues.push({ id: ++issueSeq, code, detail, at: Date.now() });
  }
  dismiss(id: number) {
    this.issues = this.issues.filter((i) => i.id !== id);
  }
  dismissGaps() {
    this.gaps = [];
  }

  // ---------- состояние для интерфейса ----------

  get recording() {
    return this.status === 'recording';
  }
  get elapsedMs() {
    return this.status === 'recording' ? Math.max(0, this.now - this.startedAt) : 0;
  }
  get mode(): RunMode {
    if (this.engine === 'webspeech') return this.captureOn ? 'webspeech+capture' : 'webspeech-only';
    return this.engine === 'whisper' ? 'capture+whisper' : 'capture';
  }
  isQueued(segId: string) {
    return this.queue.some((j) => j.segId === segId);
  }
  /** Фрагменты ждут Whisper, а модель не готова */
  get waitingForModel() {
    return this.queue.length > 0 && whisper.status !== 'ready' && whisper.status !== 'loading' && whisper.status !== 'downloading';
  }

  // ---------- старт / стоп ----------

  async start(entry: JournalEntry) {
    if (this.status !== 'idle') return;
    this.entryId = entry.id;
    this.status = 'starting';
    await this.ensureSettings();
    const s = this.settings;
    this.issues = [];
    this.gaps = [];
    this.#lastFrameWall = 0;
    this.#characterId = entry.characterId;
    this.segCount = 0;
    this.interim = '';
    this.currentSegId = null;
    this.#lastEndedSegId = null;
    this.noiseDb = MIN_DB;

    let engine: EngineId = s.engine;
    if (engine === 'webspeech' && !WebSpeechEngine.supported()) {
      this.issue('speech-unsupported');
      engine = 'none'; // звук всё равно пишем — потом можно распознать Whisper
    }
    this.engine = engine;

    const capOk = await this.#startCapture();
    if (!capOk && engine !== 'webspeech') {
      this.status = 'idle'; // entryId оставляем — панель покажет ошибку в этой записи
      return;
    }

    if (engine === 'whisper') void this.ensureWhisper(false);

    if (engine === 'webspeech') {
      const sp = new WebSpeechEngine({
        onInterim: (text) => (this.interim = text),
        onFinal: (text) => this.#onFinal(text),
        onError: (code, fatal, detail) => this.#onSpeechError(code, fatal, detail),
        onRunning: (r) => (this.speechOn = r),
      });
      sp.gate = () =>
        !this.captureOn || !this.settings.webspeechGate || this.vadSpeech || Date.now() - this.#lastSpeechEndAt < GATE_KEEP_MS;
      this.#speech = sp;
      sp.start(LANGS[s.language].speech);
    }

    void this.#wakeLock.acquire().then(() => {
      if (this.wake === 'error') this.issue('wakelock', this.#wakeLock.error);
    });
    document.addEventListener('visibilitychange', this.#onVisibility);
    window.addEventListener('beforeunload', this.#onBeforeUnload);
    this.startedAt = Date.now();
    this.now = this.startedAt;
    this.#ticker = setInterval(() => this.#tick(), 1000);
    this.status = 'recording';
  }

  async stop() {
    if (this.status === 'idle') return;
    if (this.#vad) this.#handle(this.#vad.flush());
    this.#speech?.stop();
    this.#speech = null;
    this.#capture.stop();
    this.#vad = null;
    this.captureOn = false;
    this.speechOn = false;
    this.vadSpeech = false;
    this.interim = '';
    this.currentSegId = null;
    this.levelDb = MIN_DB;
    if (this.#ticker) clearInterval(this.#ticker);
    this.#ticker = null;
    document.removeEventListener('visibilitychange', this.#onVisibility);
    window.removeEventListener('beforeunload', this.#onBeforeUnload);
    await this.#wakeLock.release();
    this.status = 'idle';
    await journal.flush();
  }

  /** Повторить захват микрофона (кнопка в ошибке) */
  async retryCapture() {
    if (this.status !== 'recording') return;
    const ok = await this.#startCapture();
    if (ok) this.issues = this.issues.filter((i) => !i.code.startsWith('mic-') && i.code !== 'audio-context');
  }

  /** Web Speech: отключить параллельный захват (если Chrome не делит микрофон) */
  dropCapture() {
    if (this.#vad) this.#handle(this.#vad.flush());
    this.#capture.stop();
    this.#vad = null;
    this.captureOn = false;
    this.vadSpeech = false;
    this.levelDb = MIN_DB;
    this.#speech?.kick();
  }

  async #startCapture(): Promise<boolean> {
    this.#capture.stop();
    this.captureOn = false;
    this.#vad = new VadSegmenter({ sampleRate: WHISPER_RATE, thresholdDb: sliderToDb(this.settings.threshold) });
    try {
      await this.#capture.start({
        autoGain: this.settings.autoGain,
        noiseSuppression: this.settings.noiseSuppression,
        onFrame: (f) => this.#onFrame(f),
        onEnded: () => this.#onTrackEnded(),
      });
      this.captureOn = true;
      return true;
    } catch (e) {
      const code: CaptureErrorCode = e instanceof CaptureError ? e.code : 'mic-failed';
      this.issue(code, (e as Error)?.message ?? '');
      this.#vad = null;
      return false;
    }
  }

  async #restartCapture() {
    this.#lastCaptureRestart = Date.now();
    if (this.#vad) this.#handle(this.#vad.flush());
    const ok = await this.#startCapture();
    if (!ok) this.issue('mic-lost');
  }

  #onTrackEnded() {
    if (this.status !== 'recording') return;
    if (document.visibilityState === 'visible') void this.#restartCapture();
    // иначе перезапустим при возврате на экран
  }

  #tick() {
    this.now = Date.now();
    if (this.status !== 'recording' || !this.captureOn || document.visibilityState !== 'visible') return;
    // звук перестал приходить — пробуем перезапустить микрофон (не чаще раза в 10 с)
    const stalled = performance.now() - this.#capture.lastFrameAt > 4000;
    if (stalled && Date.now() - this.#lastCaptureRestart > 10000) void this.#restartCapture();
  }

  #onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (this.status === 'recording') e.preventDefault();
  };

  #onVisibility = async () => {
    if (this.status !== 'recording') return;
    if (document.visibilityState === 'hidden') {
      this.#hiddenAt = Date.now();
      return;
    }
    const hiddenAt = this.#hiddenAt;
    this.#hiddenAt = 0;
    await this.#wakeLock.reacquire();
    if (this.captureOn) {
      const alive = await this.#capture.resume();
      if (!alive) await this.#restartCapture();
    } else if (this.engine !== 'webspeech') {
      await this.#restartCapture();
    }
    // без захвата не знаем точно, слушал ли Chrome — предупреждаем мягко
    if (!this.captureOn && hiddenAt && Date.now() - hiddenAt > 3000) this.gaps.push({ from: hiddenAt, to: Date.now(), certain: false });
    this.#speech?.kick();
  };

  // ---------- звук → фрагменты ----------

  #onFrame(frame: Float32Array) {
    const wall = Date.now();
    if (this.#lastFrameWall && wall - this.#lastFrameWall > 2500) this.gaps.push({ from: this.#lastFrameWall, to: wall, certain: true });
    this.#lastFrameWall = wall;
    if (!this.#vad) return;
    this.#handle(this.#vad.push(frame));
  }

  #handle(events: VadEvent[]) {
    for (const e of events) {
      if (e.type === 'level') {
        this.levelDb = e.db;
        // оценка шума: быстро вниз, медленно вверх
        this.noiseDb = this.noiseDb <= MIN_DB || e.db < this.noiseDb ? e.db : this.noiseDb + 0.01;
      } else if (e.type === 'start') {
        // время по часам: «сейчас» минус то, что детектор уже успел накопить
        const lag = this.#vad ? Math.max(0, this.#vad.positionMs - e.startedAt) : 0;
        this.#onSegStart(Date.now() - lag);
      } else {
        this.#onSegEnd(e.samples, e.durationMs);
      }
    }
  }

  #append(seg: TranscriptSegment): boolean {
    const id = this.entryId;
    if (!id || !journal.get(id)) {
      this.issue('entry-missing');
      void this.stop();
      return false;
    }
    journal.appendSegment(id, seg);
    return true;
  }

  #seg(segId: string): TranscriptSegment | undefined {
    return this.entryId ? journal.get(this.entryId)?.transcript.find((s) => s.id === segId) : undefined;
  }

  #onSegStart(wallMs: number) {
    this.vadSpeech = true;
    this.#speech?.kick();
    const seg: TranscriptSegment = {
      id: uid(),
      at: new Date(wallMs).toISOString(),
      durationMs: 0,
      text: '',
      audioId: null,
      status: 'pending',
      sentToClaude: false,
    };
    if (this.#append(seg)) this.currentSegId = seg.id;
  }

  #onSegEnd(samples: Float32Array, durationMs: number) {
    this.vadSpeech = false;
    this.#lastSpeechEndAt = Date.now();
    const segId = this.currentSegId;
    this.currentSegId = null;
    const entryId = this.entryId;
    if (!segId || !entryId) return;
    this.#lastEndedSegId = segId;
    this.segCount++;
    journal.updateSegment(entryId, segId, { durationMs: Math.round(durationMs) });
    const engine = this.engine;
    const keep = this.settings.keepAudio;
    const store = keep || engine === 'none' || engine === 'whisper';
    void (async () => {
      let audioId: string | null = null;
      if (store) {
        try {
          audioId = await putMedia(this.#characterId, encodeWav(samples, WHISPER_RATE), 'audio');
          journal.updateSegment(entryId, segId, { audioId });
        } catch (e) {
          this.issue('save-failed', (e as Error)?.message ?? '');
        }
      }
      if (engine === 'none') {
        journal.updateSegment(entryId, segId, { status: 'none' });
      } else if (engine === 'whisper') {
        this.#enqueue({ entryId, segId, audioId, audio: audioId ? null : samples, temp: !keep && !!audioId });
      } else {
        const done = () => {
          const e = journal.get(entryId);
          const s = e?.transcript.find((x) => x.id === segId);
          if (!e || !s || s.status !== 'pending') return;
          if (s.text) journal.updateSegment(entryId, segId, { status: 'done' });
          else if (s.audioId) journal.updateSegment(entryId, segId, { status: 'none' });
          // ни текста, ни звука — это был шум, строка не нужна
          else e.transcript = e.transcript.filter((x) => x.id !== segId);
        };
        if (this.#seg(segId)?.text) done();
        else setTimeout(done, SPEECH_GRACE_MS);
      }
    })();
  }

  // ---------- Web Speech ----------

  #onFinal(text: string) {
    const entryId = this.entryId;
    if (!entryId) return;
    const target =
      this.currentSegId ?? (this.#lastEndedSegId && Date.now() - this.#lastSpeechEndAt < SPEECH_GRACE_MS ? this.#lastEndedSegId : null);
    const seg = target ? this.#seg(target) : undefined;
    if (seg) {
      const patch: Partial<TranscriptSegment> = { text: (seg.text ? seg.text + ' ' : '') + text };
      if (target !== this.currentSegId) patch.status = 'done';
      journal.updateSegment(entryId, seg.id, patch);
      return;
    }
    // речь, которую детектор не поймал (или захвата нет) — отдельный фрагмент только с текстом
    const ok = this.#append({
      id: uid(),
      at: new Date().toISOString(),
      durationMs: 0,
      text,
      audioId: null,
      status: 'done',
      sentToClaude: false,
    });
    if (ok) this.segCount++;
  }

  #onSpeechError(code: SpeechErrorCode, fatal: boolean, detail: string) {
    const map: Record<SpeechErrorCode, IssueCode> = {
      unsupported: 'speech-unsupported',
      'not-allowed': 'speech-denied',
      network: 'speech-network',
      language: 'speech-language',
      'audio-capture': 'speech-audio-capture',
      other: 'speech-other',
    };
    this.issue(map[code], detail);
    // Chrome не может делить микрофон с нашим захватом — оставляем только распознавание
    if (code === 'audio-capture' && this.captureOn) this.dropCapture();
    if (fatal) {
      // распознавание остановилось — продолжаем писать звук, текст можно получить потом Whisper
      this.engine = 'none';
      this.#speech = null;
      this.speechOn = false;
      this.interim = '';
      if (!this.captureOn && this.status === 'recording')
        void this.#startCapture().then((ok) => {
          if (!ok) void this.stop();
        });
    }
  }

  // ---------- Whisper ----------

  /** Подготовить модель. allowDownload=false — только из кеша, без скачивания. */
  async ensureWhisper(allowDownload: boolean): Promise<boolean> {
    const s = this.settings;
    if (whisper.isFor(s.whisperModel, s.whisperDevice) && whisper.ready) return true;
    if (!allowDownload) {
      const cached = await whisper.check(s.whisperModel, s.whisperDevice);
      if (cached === false) return false;
    }
    const ok = await whisper.load(s.whisperModel, s.whisperDevice, allowDownload);
    if (!ok && allowDownload) this.issue('whisper-load', whisper.error);
    if (ok) {
      this.issues = this.issues.filter((i) => i.code !== 'whisper-load');
      void this.#pump();
    }
    return ok;
  }

  downloadModel() {
    return this.ensureWhisper(true);
  }

  #enqueue(job: Job) {
    if (this.isQueued(job.segId)) return;
    this.segErrors.delete(job.segId);
    journal.updateSegment(job.entryId, job.segId, { status: 'pending' });
    this.queue = [...this.queue, job];
    void this.#pump();
  }

  /** «Розпізнати» / «Повторити» для фрагмента с сохранённым аудио */
  recognize(entryId: string, seg: TranscriptSegment) {
    if (!seg.audioId) {
      ui.toast(t('session.noAudio'));
      return;
    }
    this.#enqueue({ entryId, segId: seg.id, audioId: seg.audioId, audio: null, temp: false });
  }

  /** Фрагменты записи, которые можно отдать Whisper */
  recognizable(entry: JournalEntry): TranscriptSegment[] {
    return entry.transcript.filter((s) => !!s.audioId && !s.text.trim() && s.id !== this.currentSegId && !this.isQueued(s.id));
  }

  recognizeAll(entry: JournalEntry) {
    for (const s of this.recognizable(entry)) this.recognize(entry.id, s);
  }

  async #loadAudio(audioId: string): Promise<Float32Array | null> {
    const blob = await getMediaBlob(audioId);
    if (!blob) return null;
    const { samples, sampleRate } = decodeWav(await blob.arrayBuffer());
    return resample(samples, sampleRate, WHISPER_RATE);
  }

  async #pump() {
    if (this.#pumping) return;
    this.#pumping = true;
    try {
      while (this.queue.length) {
        const s = this.settings;
        if (!(whisper.isFor(s.whisperModel, s.whisperDevice) && whisper.ready)) {
          const ok = await this.ensureWhisper(false);
          if (!ok) break; // ждём «Завантажити модель»; очередь сохраняется
        }
        const job = this.queue[0];
        this.busySegId = job.segId;
        try {
          const audio = job.audio ?? (job.audioId ? await this.#loadAudio(job.audioId) : null);
          if (!audio) throw new Error(t('session.noAudio'));
          const { text, ms } = await whisper.transcribe(audio, LANGS[this.settings.language].whisper);
          journal.updateSegment(job.entryId, job.segId, { text: cleanTranscript(text), status: 'done' });
          this.segTimes.set(job.segId, ms);
          if (job.temp && job.audioId) {
            await deleteMedia(job.audioId).catch(() => {});
            journal.updateSegment(job.entryId, job.segId, { audioId: null });
          }
        } catch (e) {
          this.segErrors.set(job.segId, (e as Error)?.message ?? String(e));
          journal.updateSegment(job.entryId, job.segId, { status: 'error' });
        } finally {
          this.queue = this.queue.filter((j) => j !== job);
          this.busySegId = null;
        }
      }
    } finally {
      this.#pumping = false;
    }
  }

  // ---------- правка фрагментов ----------

  removeSegment(entryId: string, segId: string) {
    const e = journal.get(entryId);
    if (!e) return;
    const idx = e.transcript.findIndex((s) => s.id === segId);
    if (idx < 0) return;
    const before = $state.snapshot(e.transcript[idx]) as TranscriptSegment;
    this.queue = this.queue.filter((j) => j.segId !== segId);
    if (this.currentSegId === segId) this.currentSegId = null;
    e.transcript.splice(idx, 1);
    let undone = false;
    ui.toast(t('session.segDeleted'), () => {
      undone = true;
      const cur = journal.get(entryId);
      if (!cur) return;
      const at = cur.transcript.findIndex((s) => s.at > before.at);
      if (at < 0) cur.transcript.push(before);
      else cur.transcript.splice(at, 0, before);
    });
    if (before.audioId) {
      const audioId = before.audioId;
      setTimeout(() => {
        if (!undone) void deleteMedia(audioId).catch(() => {});
      }, 6000);
    }
  }

  editSegment(entryId: string, segId: string, text: string) {
    journal.updateSegment(entryId, segId, { text: text.trim(), status: text.trim() ? 'done' : 'none' });
  }
}

export const recorder = new SessionRecorder();
