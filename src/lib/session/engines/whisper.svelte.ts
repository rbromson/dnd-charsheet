/**
 * Клиент Whisper: держит воркер, состояние модели (для интерфейса) и очередь запросов.
 * Воркер создаётся лениво — пока Whisper не нужен, ничего не грузится.
 */
import type { FromWorker, ToWorker } from './whisper-protocol';
import { WHISPER_MODELS, type WhisperDevice, type WhisperModelId } from '../settings';

export type ModelStatus = 'unknown' | 'checking' | 'absent' | 'cached' | 'downloading' | 'loading' | 'ready' | 'error';

class WhisperClient {
  status = $state<ModelStatus>('unknown');
  progress = $state(0);
  loadedBytes = $state(0);
  totalBytes = $state(0);
  error = $state('');
  /** Какая модель/устройство описаны в status */
  key = $state('');
  /** Время последнего распознавания, мс, и длина звука, мс — для оценки скорости */
  lastRunMs = $state(0);
  lastAudioMs = $state(0);

  #worker: Worker | null = null;
  #seq = 0;
  #pending = new Map<number, { resolve: (r: { text: string; ms: number }) => void; reject: (e: Error) => void }>();
  #waiters: ((m: FromWorker) => boolean)[] = [];

  static keyOf(model: WhisperModelId, device: WhisperDevice) {
    return `${model}|${device}`;
  }

  #ensure(): Worker {
    if (this.#worker) return this.#worker;
    const w = new Worker(new URL('./whisper.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<FromWorker>) => this.#onMessage(e.data);
    w.onerror = (e) => this.#crash(e.message || 'worker error');
    w.onmessageerror = () => this.#crash('worker message error');
    this.#worker = w;
    return w;
  }

  #crash(message: string) {
    this.#worker?.terminate();
    this.#worker = null;
    this.status = 'error';
    this.error = message;
    for (const p of this.#pending.values()) p.reject(new Error(message));
    this.#pending.clear();
    const ws = this.#waiters;
    this.#waiters = [];
    for (const w of ws) w({ type: 'load-error', message });
  }

  #send(m: ToWorker, transfer: Transferable[] = []) {
    this.#ensure().postMessage(m, transfer);
  }

  #wait(pred: (m: FromWorker) => boolean): Promise<FromWorker> {
    return new Promise((resolve) => {
      this.#waiters.push((m) => {
        if (!pred(m)) return false;
        resolve(m);
        return true;
      });
    });
  }

  #onMessage(m: FromWorker) {
    switch (m.type) {
      case 'progress':
        this.progress = m.progress;
        this.loadedBytes = m.loaded;
        this.totalBytes = m.total;
        break;
      case 'result': {
        const p = this.#pending.get(m.id);
        this.#pending.delete(m.id);
        this.lastRunMs = m.ms;
        p?.resolve({ text: m.text, ms: m.ms });
        break;
      }
      case 'run-error': {
        const p = this.#pending.get(m.id);
        this.#pending.delete(m.id);
        p?.reject(new Error(m.message));
        break;
      }
    }
    this.#waiters = this.#waiters.filter((w) => !w(m));
  }

  get ready() {
    return this.status === 'ready';
  }

  isFor(model: WhisperModelId, device: WhisperDevice) {
    return this.key === WhisperClient.keyOf(model, device);
  }

  /** Есть ли модель в кеше (без скачивания). */
  async check(model: WhisperModelId, device: WhisperDevice): Promise<boolean | null> {
    const key = WhisperClient.keyOf(model, device);
    if (this.key === key && (this.status === 'ready' || this.status === 'downloading' || this.status === 'loading')) return true;
    this.key = key;
    this.status = 'checking';
    this.error = '';
    const repo = WHISPER_MODELS[model].repo;
    this.#send({ type: 'check', repo, device });
    const m = await this.#wait((x) => x.type === 'checked' || x.type === 'load-error');
    if (this.key !== key) return null;
    if (m.type !== 'checked') {
      this.status = 'error';
      this.error = m.type === 'load-error' ? m.message : '';
      return null;
    }
    // null — не удалось проверить (например, офлайн)
    this.status = m.cached === null ? 'unknown' : m.cached ? 'cached' : 'absent';
    return m.cached;
  }

  /** Загрузить модель. allowDownload=false — только из кеша. */
  async load(model: WhisperModelId, device: WhisperDevice, allowDownload: boolean): Promise<boolean> {
    const key = WhisperClient.keyOf(model, device);
    if (this.key === key && this.status === 'ready') return true;
    if (this.key === key && (this.status === 'downloading' || this.status === 'loading')) {
      const m = await this.#wait((x) => x.type === 'ready' || x.type === 'load-error');
      return m.type === 'ready';
    }
    this.key = key;
    this.status = allowDownload ? 'downloading' : 'loading';
    this.progress = 0;
    this.loadedBytes = 0;
    this.totalBytes = 0;
    this.error = '';
    this.#send({ type: 'load', repo: WHISPER_MODELS[model].repo, device, localOnly: !allowDownload });
    const m = await this.#wait((x) => x.type === 'ready' || x.type === 'load-error');
    if (this.key !== key) return false;
    if (m.type === 'ready') {
      this.status = 'ready';
      this.progress = 100;
      return true;
    }
    this.status = allowDownload ? 'error' : 'absent';
    this.error = m.type === 'load-error' ? m.message : '';
    return false;
  }

  transcribe(audio16k: Float32Array, language: string): Promise<{ text: string; ms: number }> {
    if (this.status !== 'ready') return Promise.reject(new Error('model not loaded'));
    const id = ++this.#seq;
    this.lastAudioMs = Math.round((audio16k.length / 16000) * 1000);
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      // копия — исходный буфер может ещё понадобиться
      const copy = audio16k.slice();
      this.#send({ type: 'run', id, audio: copy, language }, [copy.buffer]);
    });
  }

  async clear(model: WhisperModelId, device: WhisperDevice): Promise<string> {
    this.#send({ type: 'clear', repo: WHISPER_MODELS[model].repo, device });
    const m = await this.#wait((x) => x.type === 'cleared');
    if (this.isFor(model, device)) this.status = 'absent';
    return m.type === 'cleared' ? (m.error ?? '') : '';
  }
}

export const whisper = new WhisperClient();
