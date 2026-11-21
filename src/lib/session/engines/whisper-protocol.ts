/** Сообщения между главным потоком и whisper.worker.ts */
import type { WhisperDevice } from '../settings';

export type ToWorker =
  | { type: 'check'; repo: string; device: WhisperDevice }
  | { type: 'load'; repo: string; device: WhisperDevice; localOnly: boolean }
  | { type: 'run'; id: number; audio: Float32Array; language: string }
  | { type: 'clear'; repo: string; device: WhisperDevice };

export type FromWorker =
  | { type: 'checked'; repo: string; device: WhisperDevice; cached: boolean | null; error?: string }
  | { type: 'progress'; progress: number; loaded: number; total: number }
  | { type: 'ready'; repo: string; device: WhisperDevice }
  | { type: 'load-error'; message: string }
  | { type: 'result'; id: number; text: string; ms: number }
  | { type: 'run-error'; id: number; message: string }
  | { type: 'cleared'; error?: string };

/** Типы весов: на WASM — 8-битные, на WebGPU — как в официальном демо transformers.js. */
export function dtypeFor(device: WhisperDevice) {
  return device === 'webgpu'
    ? ({ encoder_model: 'fp32', decoder_model_merged: 'q4' } as const)
    : ({ encoder_model: 'q8', decoder_model_merged: 'q8' } as const);
}
