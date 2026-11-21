import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSpeechEngine } from './webspeech';

class FakeRec extends EventTarget {
  static instances: FakeRec[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  started = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onstart: (() => void) | null = null;
  constructor() {
    super();
    FakeRec.instances.push(this);
  }
  start() {
    this.started = true;
    this.onstart?.();
  }
  stop() {
    this.end();
  }
  abort() {
    this.end();
  }
  end() {
    this.started = false;
    this.onend?.();
  }
  result(items: [string, boolean][], resultIndex = 0) {
    const results = items.map(([t, f]) => Object.assign([{ transcript: t }], { isFinal: f }));
    this.onresult?.({ resultIndex, results });
  }
}

function setup() {
  const cb = { onInterim: vi.fn(), onFinal: vi.fn(), onError: vi.fn(), onRunning: vi.fn() };
  const eng = new WebSpeechEngine(cb);
  return { cb, eng };
}

describe('WebSpeechEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeRec.instances = [];
    (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = FakeRec;
  });
  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  });

  it('reports unsupported', () => {
    delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    const { cb, eng } = setup();
    expect(WebSpeechEngine.supported()).toBe(false);
    eng.start('uk-UA');
    expect(cb.onError).toHaveBeenCalledWith('unsupported', true, '');
  });

  it('configures recognizer and emits interim and final text', () => {
    const { cb, eng } = setup();
    eng.start('uk-UA');
    const r = FakeRec.instances[0];
    expect(r.lang).toBe('uk-UA');
    expect(r.continuous).toBe(true);
    expect(r.interimResults).toBe(true);
    expect(cb.onRunning).toHaveBeenCalledWith(true);
    r.result([['привіт', false]]);
    expect(cb.onInterim).toHaveBeenLastCalledWith('привіт');
    r.result([['привіт усім', true]]);
    expect(cb.onFinal).toHaveBeenCalledWith('привіт усім');
  });

  it('strips repeated prefix of previous final (Android quirk)', () => {
    const { cb, eng } = setup();
    eng.start('uk-UA');
    const r = FakeRec.instances[0];
    r.result([['йдемо до архіву', true]], 0);
    r.result([['йдемо до архіву', true], ['йдемо до архіву завтра', true]], 1);
    expect(cb.onFinal).toHaveBeenNthCalledWith(1, 'йдемо до архіву');
    expect(cb.onFinal).toHaveBeenNthCalledWith(2, 'завтра');
  });

  it('auto-restarts after end, with growing delay on rapid ends', () => {
    const { eng } = setup();
    eng.start('uk-UA');
    FakeRec.instances[0].end(); // сразу оборвалось
    expect(FakeRec.instances).toHaveLength(1);
    vi.advanceTimersByTime(299);
    expect(FakeRec.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeRec.instances).toHaveLength(2);
    FakeRec.instances[1].end();
    vi.advanceTimersByTime(599);
    expect(FakeRec.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeRec.instances).toHaveLength(3);
  });

  it('gate=false waits for kick()', () => {
    const { eng } = setup();
    let open = false;
    eng.gate = () => open;
    eng.start('uk-UA');
    vi.advanceTimersByTime(5000);
    FakeRec.instances[0].end();
    vi.advanceTimersByTime(10000);
    expect(FakeRec.instances).toHaveLength(1);
    open = true;
    eng.kick();
    expect(FakeRec.instances).toHaveLength(2);
  });

  it('not-allowed is fatal and stops restarting; no-speech is ignored', () => {
    const { cb, eng } = setup();
    eng.start('uk-UA');
    const r = FakeRec.instances[0];
    r.onerror?.({ error: 'no-speech' });
    expect(cb.onError).not.toHaveBeenCalled();
    r.onerror?.({ error: 'not-allowed' });
    r.end();
    vi.advanceTimersByTime(10000);
    expect(cb.onError).toHaveBeenCalledWith('not-allowed', true, 'not-allowed');
    expect(FakeRec.instances).toHaveLength(1);
  });

  it('network error is reported and retried later', () => {
    const { cb, eng } = setup();
    eng.start('uk-UA');
    vi.advanceTimersByTime(2000);
    const r = FakeRec.instances[0];
    r.onerror?.({ error: 'network', message: '' });
    r.end();
    expect(cb.onError).toHaveBeenCalledWith('network', false, 'network');
    vi.advanceTimersByTime(2999);
    expect(FakeRec.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeRec.instances).toHaveLength(2);
  });

  it('stop() prevents restarts', () => {
    const { eng } = setup();
    eng.start('uk-UA');
    eng.stop();
    vi.advanceTimersByTime(10000);
    expect(FakeRec.instances).toHaveLength(1);
    expect(eng.running).toBe(false);
  });
});
