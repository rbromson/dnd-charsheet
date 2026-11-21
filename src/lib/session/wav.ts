/** WAV (PCM 16 бит, моно) и пересэмплирование. Чистые функции — см. wav.test.ts. */

export const WHISPER_RATE = 16000;

export function encodeWavBytes(samples: Float32Array, sampleRate: number): Uint8Array {
  const dataLen = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + dataLen, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true); // размер fmt
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // моно
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // байт в секунду
  v.setUint16(32, 2, true); // выравнивание блока
  v.setUint16(34, 16, true); // бит
  str(36, 'data');
  v.setUint32(40, dataLen, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buf);
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  return new Blob([encodeWavBytes(samples, sampleRate) as BlobPart], { type: 'audio/wav' });
}

/** Разбор WAV PCM 16 бит (наш формат; несколько каналов сводятся в моно). */
export function decodeWav(input: ArrayBuffer): { samples: Float32Array; sampleRate: number } {
  const v = new DataView(input);
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (input.byteLength < 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV file');
  let o = 12;
  let channels = 1;
  let sampleRate = 0;
  let bits = 16;
  let format = 1;
  while (o + 8 <= input.byteLength) {
    const id = tag(o);
    const size = v.getUint32(o + 4, true);
    const body = o + 8;
    if (id === 'fmt ') {
      format = v.getUint16(body, true);
      channels = v.getUint16(body + 2, true);
      sampleRate = v.getUint32(body + 4, true);
      bits = v.getUint16(body + 14, true);
    } else if (id === 'data') {
      if (format !== 1 || bits !== 16) throw new Error(`unsupported WAV format ${format}/${bits}`);
      const frames = Math.floor(Math.min(size, input.byteLength - body) / (2 * channels));
      const out = new Float32Array(frames);
      for (let f = 0; f < frames; f++) {
        let acc = 0;
        for (let c = 0; c < channels; c++) acc += v.getInt16(body + (f * channels + c) * 2, true) / 0x8000;
        out[f] = acc / channels;
      }
      return { samples: out, sampleRate };
    }
    o = body + size + (size % 2);
  }
  throw new Error('WAV without data');
}

/**
 * Пересэмплирование моно-сигнала. При понижении частоты — усреднение по окну
 * (грубый фильтр от наложения спектра), затем линейная интерполяция.
 */
export function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  if (ratio > 1) {
    for (let i = 0; i < outLen; i++) {
      const start = i * ratio;
      const end = Math.min(input.length, start + ratio);
      let s = 0;
      let n = 0;
      for (let j = Math.floor(start); j < end; j++) {
        s += input[j];
        n++;
      }
      out[i] = n ? s / n : 0;
    }
  } else {
    for (let i = 0; i < outLen; i++) {
      const x = i * ratio;
      const j = Math.floor(x);
      const t = x - j;
      const a = input[j] ?? 0;
      const b = input[j + 1] ?? a;
      out[i] = a + (b - a) * t;
    }
  }
  return out;
}
