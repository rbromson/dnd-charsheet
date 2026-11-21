import { describe, it, expect } from 'vitest';
import { VadSegmenter, rmsToDb, sliderToDb, dbToSlider, type VadEvent } from './vad';

const SR = 16000;

/** Синус амплитуды amp длиной ms */
function tone(ms: number, amp = 0.3, freq = 440): Float32Array {
  const n = Math.round((SR * ms) / 1000);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR);
  return out;
}
function silence(ms: number): Float32Array {
  return new Float32Array(Math.round((SR * ms) / 1000));
}
function concat(...parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((s, p) => s + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
/** Подаёт звук кусками по 50 мс (как из AudioWorklet), собирает события */
function run(vad: VadSegmenter, audio: Float32Array, chunkMs = 50): VadEvent[] {
  const step = (SR * chunkMs) / 1000;
  const ev: VadEvent[] = [];
  for (let i = 0; i < audio.length; i += step) ev.push(...vad.push(audio.subarray(i, i + step)));
  return ev;
}
const ends = (ev: VadEvent[]) => ev.filter((e) => e.type === 'end') as Extract<VadEvent, { type: 'end' }>[];
const starts = (ev: VadEvent[]) => ev.filter((e) => e.type === 'start');

function make(over: Partial<ConstructorParameters<typeof VadSegmenter>[0]> = {}) {
  return new VadSegmenter({ sampleRate: SR, thresholdDb: -30, ...over });
}

describe('VadSegmenter', () => {
  it('helpers', () => {
    expect(rmsToDb(1)).toBeCloseTo(0);
    expect(rmsToDb(0.1)).toBeCloseTo(-20);
    expect(rmsToDb(0)).toBe(-90);
    expect(sliderToDb(0)).toBe(-70);
    expect(sliderToDb(100)).toBe(-10);
    expect(dbToSlider(sliderToDb(37))).toBeCloseTo(37);
  });

  it('two bursts separated by long silence → two segments', () => {
    const vad = make();
    const ev = run(vad, concat(silence(1000), tone(1000), silence(2500), tone(800), silence(2500)));
    expect(starts(ev)).toHaveLength(2);
    expect(ends(ev)).toHaveLength(2);
  });

  it('short pause inside speech does not split', () => {
    const vad = make();
    const ev = run(vad, concat(silence(600), tone(700), silence(800), tone(700), silence(2000)));
    expect(ends(ev)).toHaveLength(1);
  });

  it('includes pre-roll before the first loud window and trims the tail', () => {
    const vad = make({ prerollMs: 500, tailMs: 300 });
    const ev = run(vad, concat(silence(2000), tone(1000), silence(3000)));
    const [seg] = ends(ev);
    expect(seg).toBeDefined();
    // начало ≈ 2000 − 500 мс
    expect(seg.startedAt).toBeGreaterThanOrEqual(1450);
    expect(seg.startedAt).toBeLessThanOrEqual(1520);
    // длительность ≈ 500 + 1000 + 300 (± окно)
    expect(seg.durationMs).toBeGreaterThan(1700);
    expect(seg.durationMs).toBeLessThan(1900);
    expect(seg.samples.length).toBe(Math.round((seg.durationMs * SR) / 1000));
    // в начале — тишина предзаписи, дальше — тон
    expect(Math.abs(seg.samples[100])).toBe(0);
    const mid = seg.samples.subarray(Math.round(0.7 * SR), Math.round(0.8 * SR));
    expect(Math.max(...mid)).toBeGreaterThan(0.2);
  });

  it('ignores short blips (no start event at all)', () => {
    const vad = make({ minSpeechMs: 300 });
    const ev = run(vad, concat(silence(500), tone(90), silence(2500), tone(120), silence(2500)));
    expect(starts(ev)).toHaveLength(0);
    expect(ends(ev)).toHaveLength(0);
  });

  it('quiet sound below threshold is ignored', () => {
    const vad = make({ thresholdDb: -20 });
    const ev = run(vad, concat(tone(2000, 0.01), silence(2000)));
    expect(ends(ev)).toHaveLength(0);
  });

  it('splits long continuous speech at maxSegmentMs', () => {
    const vad = make({ maxSegmentMs: 5000, softSplitMs: 1000 });
    const ev = run(vad, concat(silence(500), tone(12000), silence(2500)));
    const e = ends(ev);
    expect(e.length).toBe(3);
    for (const s of e) expect(s.durationMs).toBeLessThanOrEqual(5000 + 31);
    // без потерь: сумма длительностей покрывает всю речь
    const total = e.reduce((s, x) => s + x.durationMs, 0);
    expect(total).toBeGreaterThan(12000);
  });

  it('soft split happens on a pause near the limit', () => {
    const vad = make({ maxSegmentMs: 5000, softSplitMs: 2000, hangoverMs: 1500 });
    // 3.5 c речи, пауза 400 мс (меньше hangover), ещё 3 с речи
    const ev = run(vad, concat(silence(200), tone(3500), silence(400), tone(3000), silence(2500)));
    const e = ends(ev);
    expect(e.length).toBe(2);
    expect(e[0].durationMs).toBeLessThan(4300);
  });

  it('flush closes an open segment', () => {
    const vad = make();
    const ev = run(vad, concat(silence(300), tone(1500)));
    expect(ends(ev)).toHaveLength(0);
    const f = vad.flush();
    expect(ends(f)).toHaveLength(1);
    expect(vad.inSpeech).toBe(false);
  });

  it('emits one level event per push', () => {
    const vad = make();
    const ev = vad.push(tone(50));
    expect(ev[0].type).toBe('level');
    expect((ev[0] as { db: number }).db).toBeGreaterThan(-15);
  });

  it('threshold can be changed on the fly', () => {
    const vad = make({ thresholdDb: -5 });
    let ev = run(vad, concat(tone(1000), silence(2000)));
    expect(ends(ev)).toHaveLength(0);
    vad.thresholdDb = -30;
    ev = run(vad, concat(tone(1000), silence(2000)));
    expect(ends(ev)).toHaveLength(1);
  });
});
