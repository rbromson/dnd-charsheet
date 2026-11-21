import { describe, it, expect } from 'vitest';
import { encodeWavBytes, encodeWav, decodeWav, resample } from './wav';

describe('wav', () => {
  it('writes a correct 44-byte PCM16 mono header', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const b = encodeWavBytes(samples, 16000);
    const v = new DataView(b.buffer);
    const tag = (o: number) => String.fromCharCode(...b.subarray(o, o + 4));
    expect(b.length).toBe(44 + samples.length * 2);
    expect(tag(0)).toBe('RIFF');
    expect(v.getUint32(4, true)).toBe(36 + samples.length * 2);
    expect(tag(8)).toBe('WAVE');
    expect(tag(12)).toBe('fmt ');
    expect(v.getUint16(20, true)).toBe(1);
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(16000);
    expect(v.getUint32(28, true)).toBe(32000);
    expect(v.getUint16(34, true)).toBe(16);
    expect(tag(36)).toBe('data');
    expect(v.getUint32(40, true)).toBe(10);
    expect(v.getInt16(44 + 3 * 2, true)).toBe(32767);
    expect(v.getInt16(44 + 4 * 2, true)).toBe(-32768);
  });

  it('blob has audio/wav type and right size', () => {
    const blob = encodeWav(new Float32Array(1600), 16000);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + 3200);
  });

  it('round-trips through decodeWav', () => {
    const src = new Float32Array(400).map((_, i) => Math.sin(i / 10) * 0.8);
    const { samples, sampleRate } = decodeWav(encodeWavBytes(src, 16000).buffer as ArrayBuffer);
    expect(sampleRate).toBe(16000);
    expect(samples.length).toBe(400);
    for (let i = 0; i < 400; i += 37) expect(samples[i]).toBeCloseTo(src[i], 3);
  });

  it('rejects garbage', () => {
    expect(() => decodeWav(new ArrayBuffer(10))).toThrow();
  });

  it('resamples 48k → 16k with correct length and frequency preserved', () => {
    const n = 48000;
    const src = new Float32Array(n).map((_, i) => Math.sin((2 * Math.PI * 440 * i) / 48000));
    const out = resample(src, 48000, 16000);
    expect(out.length).toBe(16000);
    // число переходов через ноль ≈ 2 × 440
    let zc = 0;
    for (let i = 1; i < out.length; i++) if (out[i - 1] < 0 !== out[i] < 0) zc++;
    expect(zc).toBeGreaterThan(860);
    expect(zc).toBeLessThan(900);
  });

  it('resamples 44.1k → 16k and upsamples 8k → 16k', () => {
    expect(resample(new Float32Array(44100), 44100, 16000).length).toBe(16000);
    expect(resample(new Float32Array(8000), 8000, 16000).length).toBe(16000);
    const same = new Float32Array(5);
    expect(resample(same, 16000, 16000)).toBe(same);
  });
});
