import { getMeta, setMeta } from '../db';

export type EngineId = 'webspeech' | 'whisper' | 'none';
export type SessionLang = 'uk' | 'ru' | 'en';
export type WhisperModelId = 'tiny' | 'base' | 'small';
export type WhisperDevice = 'wasm' | 'webgpu';

export interface SessionSettings {
  engine: EngineId;
  language: SessionLang;
  /** Порог громкости, ползунок 0…100 (см. sliderToDb) */
  threshold: number;
  keepAudio: boolean;
  whisperModel: WhisperModelId;
  whisperDevice: WhisperDevice;
  /** Автоусиление микрофона (getUserMedia autoGainControl) */
  autoGain: boolean;
  noiseSuppression: boolean;
  /** Web Speech: перезапускать распознавание только когда есть звук (меньше сигналов Android) */
  webspeechGate: boolean;
}

export const DEFAULT_SETTINGS: SessionSettings = {
  engine: 'webspeech',
  language: 'uk',
  threshold: 40,
  keepAudio: true,
  whisperModel: 'base',
  whisperDevice: 'wasm',
  autoGain: true,
  noiseSuppression: true,
  webspeechGate: true,
};

export const LANGS: Record<SessionLang, { speech: string; whisper: string }> = {
  uk: { speech: 'uk-UA', whisper: 'ukrainian' },
  ru: { speech: 'ru-RU', whisper: 'russian' },
  en: { speech: 'en-US', whisper: 'english' },
};

/** Модели Whisper (ONNX, transformers.js). Размеры — примерно, для WASM (q8). */
export const WHISPER_MODELS: Record<WhisperModelId, { repo: string; sizeMb: number; sizeMbGpu: number }> = {
  tiny: { repo: 'onnx-community/whisper-tiny', sizeMb: 45, sizeMbGpu: 125 },
  base: { repo: 'onnx-community/whisper-base', sizeMb: 80, sizeMbGpu: 210 },
  small: { repo: 'onnx-community/whisper-small', sizeMb: 255, sizeMbGpu: 590 },
};

const KEY = 'sessionSettings';

export async function loadSettings(): Promise<SessionSettings> {
  try {
    const saved = await getMeta<Partial<SessionSettings>>(KEY, {});
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(s: SessionSettings): Promise<void> {
  await setMeta(KEY, { ...s });
}
