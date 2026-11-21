/**
 * Захват микрофона: getUserMedia → AudioContext → AudioWorklet (или ScriptProcessor)
 * → кадры Float32 по ~50 мс, уже приведённые к 16 кГц (частота Whisper и VAD).
 */
import { resample, WHISPER_RATE } from './wav';

export type CaptureErrorCode = 'mic-unsupported' | 'mic-denied' | 'mic-missing' | 'mic-busy' | 'audio-context' | 'mic-failed';

export class CaptureError extends Error {
  code: CaptureErrorCode;
  constructor(code: CaptureErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface CaptureOptions {
  autoGain: boolean;
  noiseSuppression: boolean;
  onFrame: (frame: Float32Array) => void;
  /** Дорожка микрофона закончилась (система забрала микрофон, экран заблокирован и т.п.) */
  onEnded: () => void;
}

const WORKLET = `
class TavernaCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.size = Math.max(128, Math.round(sampleRate / 20));
    this.buf = new Float32Array(this.size);
    this.n = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      let i = 0;
      while (i < ch.length) {
        const take = Math.min(this.size - this.n, ch.length - i);
        this.buf.set(ch.subarray(i, i + take), this.n);
        this.n += take;
        i += take;
        if (this.n === this.size) {
          this.port.postMessage(this.buf, [this.buf.buffer]);
          this.buf = new Float32Array(this.size);
          this.n = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('taverna-capture', TavernaCapture);
`;

function mapGumError(e: unknown): CaptureError {
  const name = (e as { name?: string })?.name ?? '';
  const msg = (e as Error)?.message ?? String(e);
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return new CaptureError('mic-denied', msg);
  if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') return new CaptureError('mic-missing', msg);
  if (name === 'NotReadableError' || name === 'AbortError' || name === 'TrackStartError') return new CaptureError('mic-busy', msg);
  return new CaptureError('mic-failed', `${name} ${msg}`.trim());
}

export class MicCapture {
  #stream: MediaStream | null = null;
  #ctx: AudioContext | null = null;
  #nodes: AudioNode[] = [];
  #workletUrl: string | null = null;
  #opts: CaptureOptions | null = null;
  /** Частота контекста (до пересэмплирования) */
  contextRate = 0;
  /** Как идёт звук: 'worklet' | 'script' */
  method = '';
  lastFrameAt = 0;
  running = false;

  static supported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof AudioContext !== 'undefined';
  }

  async start(opts: CaptureOptions): Promise<void> {
    this.stop();
    this.#opts = opts;
    if (!MicCapture.supported()) throw new CaptureError('mic-unsupported', 'mediaDevices.getUserMedia unavailable');
    try {
      this.#stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: opts.noiseSuppression,
          autoGainControl: opts.autoGain,
        },
      });
    } catch (e) {
      throw mapGumError(e);
    }
    const track = this.#stream.getAudioTracks()[0];
    track?.addEventListener('ended', () => {
      if (this.running) this.#opts?.onEnded();
    });

    try {
      await this.#setupGraph();
    } catch (e) {
      this.stop();
      throw new CaptureError('audio-context', (e as Error)?.message ?? String(e));
    }
    this.running = true;
    this.lastFrameAt = performance.now();
  }

  async #setupGraph() {
    const stream = this.#stream!;
    let ctx: AudioContext;
    let source: MediaStreamAudioSourceNode;
    // Сначала пробуем сразу 16 кГц (Chrome пересэмплирует сам); если нельзя — частота по умолчанию.
    try {
      ctx = new AudioContext({ sampleRate: WHISPER_RATE });
      source = ctx.createMediaStreamSource(stream);
    } catch {
      ctx = new AudioContext();
      source = ctx.createMediaStreamSource(stream);
    }
    this.#ctx = ctx;
    this.contextRate = ctx.sampleRate;
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});

    const deliver = (f: Float32Array) => {
      this.lastFrameAt = performance.now();
      const frame = ctx.sampleRate === WHISPER_RATE ? f : resample(f, ctx.sampleRate, WHISPER_RATE);
      this.#opts?.onFrame(frame);
    };

    const mute = ctx.createGain();
    mute.gain.value = 0;
    mute.connect(ctx.destination);

    let node: AudioNode;
    try {
      if (!ctx.audioWorklet) throw new Error('no audioWorklet');
      this.#workletUrl = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
      await ctx.audioWorklet.addModule(this.#workletUrl);
      const w = new AudioWorkletNode(ctx, 'taverna-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
      w.port.onmessage = (e: MessageEvent<Float32Array>) => deliver(e.data);
      node = w;
      this.method = 'worklet';
    } catch {
      const sp = ctx.createScriptProcessor(2048, 1, 1);
      sp.onaudioprocess = (e) => deliver(new Float32Array(e.inputBuffer.getChannelData(0)));
      node = sp;
      this.method = 'script';
    }
    source.connect(node);
    node.connect(mute);
    this.#nodes = [source, node, mute];
  }

  /** После возврата на экран: разбудить контекст. Возвращает false, если микрофон уже потерян. */
  async resume(): Promise<boolean> {
    const track = this.#stream?.getAudioTracks()[0];
    if (!track || track.readyState === 'ended') return false;
    if (this.#ctx && this.#ctx.state !== 'running') await this.#ctx.resume().catch(() => {});
    return this.#ctx?.state === 'running';
  }

  get contextState(): string {
    return this.#ctx?.state ?? 'closed';
  }

  stop() {
    this.running = false;
    for (const n of this.#nodes) {
      try {
        n.disconnect();
      } catch {
        /* уже отключён */
      }
    }
    this.#nodes = [];
    this.#stream?.getTracks().forEach((t) => t.stop());
    this.#stream = null;
    this.#ctx?.close().catch(() => {});
    this.#ctx = null;
    if (this.#workletUrl) URL.revokeObjectURL(this.#workletUrl);
    this.#workletUrl = null;
  }
}
