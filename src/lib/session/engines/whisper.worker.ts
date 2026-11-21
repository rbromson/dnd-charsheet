/// <reference lib="webworker" />
/**
 * Whisper на устройстве (transformers.js) в отдельном потоке.
 * Библиотека подгружается динамически только здесь — основной бандл её не содержит.
 * Модель скачивается только по явной команде 'load' с localOnly=false.
 */
import { dtypeFor, type FromWorker, type ToWorker } from './whisper-protocol';
import type { WhisperDevice } from '../settings';

type TF = typeof import('@huggingface/transformers');
type Asr = (audio: Float32Array, opts: Record<string, unknown>) => Promise<unknown>;

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let tf: TF | null = null;
let asr: Asr | null = null;
let loadedKey = '';

function post(m: FromWorker) {
  ctx.postMessage(m);
}

async function lib(): Promise<TF> {
  if (!tf) {
    tf = await import('@huggingface/transformers');
    tf.env.allowLocalModels = false;
    tf.env.useBrowserCache = true;
  }
  return tf;
}

function errText(e: unknown): string {
  if (e instanceof Error) return e.message || e.name;
  return String(e);
}

async function check(repo: string, device: WhisperDevice) {
  try {
    const t = await lib();
    const cached = await t.ModelRegistry.is_pipeline_cached('automatic-speech-recognition', repo, {
      device,
      dtype: dtypeFor(device),
    });
    post({ type: 'checked', repo, device, cached });
  } catch (e) {
    post({ type: 'checked', repo, device, cached: null, error: errText(e) });
  }
}

async function load(repo: string, device: WhisperDevice, localOnly: boolean) {
  const key = `${repo}|${device}`;
  if (asr && loadedKey === key) {
    post({ type: 'ready', repo, device });
    return;
  }
  try {
    if (device === 'webgpu') {
      const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      if (!gpu || !(await gpu.requestAdapter())) throw new Error('WebGPU недоступний на цьому пристрої');
    }
    const t = await lib();
    // суммарный прогресс по всем файлам
    const files = new Map<string, { loaded: number; total: number }>();
    let lastPost = 0;
    let hasTotal = false;
    const progress_callback = (p: Record<string, unknown>) => {
      const now = Date.now();
      if (p.status === 'progress_total') {
        hasTotal = true;
        if (now - lastPost < 200 && Number(p.progress) < 100) return;
        lastPost = now;
        post({ type: 'progress', progress: Number(p.progress) || 0, loaded: Number(p.loaded) || 0, total: Number(p.total) || 0 });
        return;
      }
      if (p.status === 'progress' && typeof p.file === 'string') {
        files.set(p.file, { loaded: Number(p.loaded) || 0, total: Number(p.total) || 0 });
        if (hasTotal || now - lastPost < 200) return;
        lastPost = now;
        let loaded = 0;
        let total = 0;
        for (const f of files.values()) {
          loaded += f.loaded;
          total += f.total;
        }
        post({ type: 'progress', progress: total ? (loaded / total) * 100 : 0, loaded, total });
      }
    };
    asr = null;
    const pipe = await t.pipeline('automatic-speech-recognition', repo, {
      device,
      dtype: dtypeFor(device),
      local_files_only: localOnly,
      progress_callback: progress_callback as never,
    });
    asr = pipe as unknown as Asr;
    loadedKey = key;
    post({ type: 'ready', repo, device });
  } catch (e) {
    asr = null;
    loadedKey = '';
    post({ type: 'load-error', message: errText(e) });
  }
}

async function run(id: number, audio: Float32Array, language: string) {
  if (!asr) {
    post({ type: 'run-error', id, message: 'model not loaded' });
    return;
  }
  const t0 = performance.now();
  try {
    const opts: Record<string, unknown> = { language, task: 'transcribe' };
    if (audio.length > 30 * 16000) {
      opts.chunk_length_s = 30;
      opts.stride_length_s = 5;
    }
    const out = await asr(audio, opts);
    const first = Array.isArray(out) ? out[0] : out;
    const text = String((first as { text?: string })?.text ?? '').trim();
    post({ type: 'result', id, text, ms: Math.round(performance.now() - t0) });
  } catch (e) {
    post({ type: 'run-error', id, message: errText(e) });
  }
}

async function clear(repo: string, device: WhisperDevice) {
  try {
    const t = await lib();
    await t.ModelRegistry.clear_pipeline_cache('automatic-speech-recognition', repo, { device, dtype: dtypeFor(device) });
    if (loadedKey.startsWith(repo + '|')) {
      asr = null;
      loadedKey = '';
    }
    post({ type: 'cleared' });
  } catch (e) {
    post({ type: 'cleared', error: errText(e) });
  }
}

// Сообщения обрабатываются строго по очереди
let chain: Promise<void> = Promise.resolve();
ctx.onmessage = (e: MessageEvent<ToWorker>) => {
  const m = e.data;
  chain = chain.then(() => {
    switch (m.type) {
      case 'check':
        return check(m.repo, m.device);
      case 'load':
        return load(m.repo, m.device, m.localOnly);
      case 'run':
        return run(m.id, m.audio, m.language);
      case 'clear':
        return clear(m.repo, m.device);
    }
  });
};
