<script lang="ts">
  /**
   * Режим сесії: запись голоса за столом → фрагменты с текстом в этой записи журнала.
   * Само состояние записи — в src/lib/session/recorder.svelte.ts (живёт, даже если панель скрыта).
   */
  import { onMount, tick } from 'svelte';
  import type { JournalEntry, TranscriptSegment } from '../../lib/model/types';
  import Icon from '../../components/Icon.svelte';
  import { t } from '../../lib/i18n';
  import { ui } from '../../lib/stores/ui.svelte';
  import { journal } from '../../lib/stores/journal.svelte';
  import { getMediaUrl } from '../../lib/stores/media';
  import { recorder } from '../../lib/session/recorder.svelte';
  import { whisper } from '../../lib/session/engines/whisper.svelte';
  import { dbToSlider } from '../../lib/session/vad';
  import { clock, unsentSegments, segmentsWithText } from '../../lib/session/claude';
  import { shareToClaude, copyTranscript, shareOrCopy } from '../../lib/session/share';
  import { buildUpdatePrompt } from '../../lib/update-prompt';
  import { historyForPrompt } from '../../lib/digest';
  import { lang } from '../../lib/i18n';
  import { transcriptLines } from '../../lib/session/claude';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { codex } from '../../lib/stores/codex.svelte';
  import SessionSettings from '../../lib/session/SessionSettings.svelte';
  import ModelBox from '../../lib/session/ModelBox.svelte';

  let { entry }: { entry: JournalEntry } = $props();

  onMount(() => {
    void recorder.ensureSettings();
  });

  const here = $derived(recorder.status !== 'idle' && recorder.entryId === entry.id);
  const elsewhere = $derived(recorder.status !== 'idle' && recorder.entryId !== entry.id);
  const otherEntry = $derived(elsewhere && recorder.entryId ? journal.get(recorder.entryId) : undefined);
  const live = $derived(here && recorder.status === 'recording');

  const segs = $derived(entry.transcript);
  const unsent = $derived(unsentSegments(entry).length);
  const anyText = $derived(segmentsWithText(entry).length > 0);
  const recognizable = $derived(recorder.recognizable(entry));

  const level = $derived(dbToSlider(recorder.levelDb));
  const above = $derived(level >= recorder.settings.threshold);
  const engineName = $derived(t(`session.engine.${recorder.settings.engine}`));
  const showModel = $derived(
    recorder.queue.some((j) => j.entryId === entry.id) ||
      (here && recorder.engine === 'whisper') ||
      (!here && recorder.settings.engine === 'whisper' && whisper.status !== 'ready'),
  );

  function fmtElapsed(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const p = (n: number) => String(n).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
  }
  const hm = (ms: number) => clock(new Date(ms).toISOString());

  // ---- состояние фрагмента ----
  type SegView = 'recording' | 'text' | 'recognizing' | 'queued' | 'waitModel' | 'waitChrome' | 'error' | 'empty' | 'none';
  function view(s: TranscriptSegment): SegView {
    if (s.id === recorder.currentSegId) return 'recording';
    if (s.text.trim()) return 'text';
    if (recorder.busySegId === s.id) return 'recognizing';
    if (recorder.isQueued(s.id)) return whisper.status === 'ready' ? 'queued' : 'waitModel';
    if (s.status === 'error') return 'error';
    if (s.status === 'pending' && live && recorder.engine === 'webspeech') return 'waitChrome';
    if (s.status === 'done') return 'empty';
    return 'none';
  }

  // ---- автопрокрутка списка ----
  let listEl = $state<HTMLDivElement | null>(null);
  let stick = true;
  function onScroll() {
    if (!listEl) return;
    stick = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 60;
  }
  $effect(() => {
    void segs.length;
    void recorder.interim;
    const last = segs[segs.length - 1];
    void last?.text;
    if (!stick) return;
    void tick().then(() => {
      if (listEl) listEl.scrollTop = listEl.scrollHeight;
    });
  });

  // ---- прослушивание ----
  let audioEl = $state<HTMLAudioElement | null>(null);
  let playingId = $state<string | null>(null);
  async function togglePlay(s: TranscriptSegment) {
    if (!audioEl) return;
    if (playingId === s.id) {
      audioEl.pause();
      playingId = null;
      return;
    }
    const url = await getMediaUrl(s.audioId);
    if (!url) {
      ui.toast(t('session.noAudio'));
      return;
    }
    audioEl.src = url;
    try {
      await audioEl.play();
      playingId = s.id;
    } catch {
      ui.toast(t('session.playFailed'));
      playingId = null;
    }
  }

  // ---- кнопки ----
  async function toggleRecording() {
    if (here) await recorder.stop();
    else await recorder.start(entry);
  }

  let sharedHint = $state(false);
  async function send() {
    const r = await shareToClaude(entry);
    if (r === 'shared' || r === 'copied') sharedHint = true;
    if (r === 'copied') ui.toast(t('session.claude.copiedFallback'), undefined, 7000);
    else if (r === 'empty') ui.toast(t('session.claude.nothing'));
    else if (r === 'failed') ui.toast(t('session.claude.failed'));
  }
  async function copy() {
    const r = await copyTranscript(entry);
    if (r === 'copied') {
      sharedHint = true;
      ui.toast(t('session.claude.copied'));
    } else if (r === 'empty') ui.toast(t('session.claude.nothing'));
    else ui.toast(t('session.claude.failed'));
  }
  /** Расшифровка + инструкция «разложи по аркушу» → Claude/ChatGPT. */
  async function sortIntoSheet() {
    const c = charStore.current;
    if (!c) return;
    const others = journal.entries.filter((e) => e.id !== entry.id);
    const text = buildUpdatePrompt(c, codex.items, transcriptLines(segmentsWithText(entry)), lang, historyForPrompt(codex.items, others));
    const r = await shareOrCopy(text, t('upd.title'));
    if (r === 'shared' || r === 'copied') ui.toast(t('upd.fromSessionDone'), undefined, 8000);
    else if (r === 'failed') ui.toast(t('session.claude.failed'));
  }
  function openSettings() {
    ui.openSheet(SessionSettings, {});
  }
</script>

<section class="card session" class:live>
  <header class="row">
    <div class="grow">
      <div class="card-title">{t('session.title')}</div>
      <div class="engine muted">{t('session.engineLabel', { name: engineName })}</div>
    </div>
    <button class="btn btn-ghost" aria-label={t('session.settings')} title={t('session.settings')} onclick={openSettings}>
      <Icon name="more" />
    </button>
  </header>

  {#if elsewhere}
    <div class="banner">
      <div class="grow">{t('session.otherEntry', { title: otherEntry?.title || (otherEntry?.sessionNo ? `#${otherEntry.sessionNo}` : '…') })}</div>
      {#if recorder.entryId}
        <button class="btn btn-outline" onclick={() => (ui.journalFocus = { kind: 'entry', id: recorder.entryId! })}>{t('session.open')}</button>
      {/if}
      <button class="btn btn-danger" onclick={() => recorder.stop()}><Icon name="stop" />{t('session.stop')}</button>
    </div>
  {:else if !here}
    <div class="idle">
      <button class="big-rec" onclick={toggleRecording} aria-label={t('session.start')}>
        <Icon name="mic" size={36} stroke={2} />
      </button>
      <div>
        <div class="big-label serif">{t('session.start')}</div>
        <div class="muted small">{t('session.keepAwake')}</div>
      </div>
    </div>
  {:else if recorder.status === 'starting'}
    <div class="idle"><div class="big-rec busy"><Icon name="mic" size={36} stroke={2} /></div><div class="big-label serif">{t('session.starting')}</div></div>
  {:else}
    <div class="rec">
      <div class="row rec-head">
        <span class="dot" class:speech={recorder.vadSpeech || recorder.speechOn}></span>
        <span class="sc rec-label">{t('session.rec')}</span>
        <span class="num elapsed">{fmtElapsed(recorder.elapsedMs)}</span>
        <span class="tag">{t(`session.mode.${recorder.mode}`)}</span>
        <span class="grow"></span>
        <button class="btn btn-danger stop" onclick={toggleRecording}><Icon name="stop" />{t('session.stop')}</button>
      </div>

      <div class="state">
        {#if recorder.captureOn}
          <b class:hot={recorder.vadSpeech}>
            {recorder.vadSpeech ? t('session.state.speech') : above ? t('session.state.listening') : t('session.state.silence')}
          </b>
        {:else if recorder.engine === 'webspeech'}
          <b class:hot={recorder.speechOn}>{recorder.speechOn ? t('session.state.chrome') : t('session.state.chromeIdle')}</b>
        {/if}
        {#if recorder.interim}<span class="interim">«{recorder.interim}»</span>{/if}
      </div>

      {#if recorder.captureOn}
        <div class="meter" aria-label={t('session.level')}>
          <div class="fill" class:above style:width="{level}%"></div>
          <div class="mark" style:left="{recorder.settings.threshold}%"></div>
        </div>
        <div class="row thr">
          <label class="grow">
            <span class="label">{t('session.threshold')} · {Math.round(recorder.settings.threshold)}</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={recorder.settings.threshold}
              oninput={(e) => recorder.update({ threshold: Number(e.currentTarget.value) })}
            />
          </label>
          <button class="btn btn-outline" title={t('session.autoThresholdHint')} onclick={() => recorder.autoThreshold()}>
            {t('session.autoThreshold')}
          </button>
        </div>
        <div class="muted small">{t('session.thresholdHint')}</div>
      {/if}

      <div class="row counters small">
        <span>{t('session.segmentsCount', { n: recorder.segCount })}</span>
        {#if recorder.queue.length}<span>· {t('session.queueCount', { n: recorder.queue.length })}</span>{/if}
        <span class="grow"></span>
        <span class:bad={recorder.wake !== 'on'}>
          {recorder.wake === 'on' ? t('session.wake.on') : recorder.wake === 'unsupported' ? t('session.wake.unsupported') : t('session.wake.off')}
        </span>
      </div>
      <div class="warnline"><Icon name="lock" size={18} />{t('session.keepAwake')}</div>

      {#if recorder.mode === 'webspeech+capture'}
        <button class="btn btn-ghost linkish" onclick={() => recorder.dropCapture()}>{t('session.dropCapture')}</button>
      {/if}
    </div>
  {/if}

  {#if recorder.entryId === entry.id}
    {#each recorder.issues as i (i.id)}
      <div class="issue" role="alert">
        <div class="grow">
          <b>{t(`session.err.${i.code}`)}</b>
          <div class="small">{t(`session.fix.${i.code}`)}</div>
          {#if i.detail}<div class="detail">{i.detail}</div>{/if}
        </div>
        <div class="issue-actions">
          {#if live && (i.code.startsWith('mic-') || i.code === 'audio-context')}
            <button class="btn btn-ink" onclick={() => recorder.retryCapture()}>{t('session.retryMic')}</button>
          {/if}
          {#if i.code.startsWith('speech-') || i.code === 'whisper-load'}
            <button class="btn btn-outline" onclick={openSettings}>{t('session.settings')}</button>
          {/if}
          <button class="btn btn-ghost" aria-label={t('session.dismiss')} onclick={() => recorder.dismiss(i.id)}><Icon name="close" size={20} /></button>
        </div>
      </div>
    {/each}
    {#if here && recorder.gaps.length}
      <div class="issue gap">
        <div class="grow">
          {#each recorder.gaps as g, k (k)}
            <div>{t(g.certain ? 'session.gap' : 'session.gapUncertain', { from: hm(g.from), to: hm(g.to) })}</div>
          {/each}
        </div>
        <button class="btn btn-ghost" aria-label={t('session.dismiss')} onclick={() => recorder.dismissGaps()}><Icon name="close" size={20} /></button>
      </div>
    {/if}
  {/if}

  {#if showModel}
    <ModelBox />
  {/if}

  {#if segs.length || here}
    <div class="list-head row">
      <div class="card-title grow">{t('session.segments')}</div>
      {#if recognizable.length}
        <button class="btn btn-outline small-btn" onclick={() => recorder.recognizeAll(entry)}>
          <Icon name="wave" size={18} />{t('session.recognizeAll', { n: recognizable.length })}
        </button>
      {/if}
    </div>
    <div class="list" bind:this={listEl} onscroll={onScroll}>
      {#if !segs.length}
        <div class="empty">{t('session.emptyList')}</div>
      {/if}
      {#each segs as s (s.id)}
        {@const v = view(s)}
        <div class="seg" class:sent={s.sentToClaude} class:current={v === 'recording'}>
          <div class="time num">{clock(s.at)}</div>
          <div class="body grow">
            {#if v === 'text'}
              {#if ui.editing}
                <textarea class="field" rows="2" value={s.text} onchange={(e) => recorder.editSegment(entry.id, s.id, e.currentTarget.value)}></textarea>
              {:else}
                <div class="text serif">{s.text}</div>
              {/if}
            {:else if v === 'recording'}
              <div class="status hot">● {t('session.seg.recording')}{#if recorder.interim} <i>«{recorder.interim}»</i>{/if}</div>
            {:else if v === 'recognizing'}
              <div class="status">{t('session.seg.recognizing')}</div>
            {:else if v === 'queued'}
              <div class="status">{t('session.seg.queued')}</div>
            {:else if v === 'waitModel'}
              <div class="status">{t('session.seg.waitModel')}</div>
            {:else if v === 'waitChrome'}
              <div class="status">{t('session.seg.waitChrome')}</div>
            {:else if v === 'error'}
              <div class="status bad">{t('session.seg.error')}</div>
              {#if recorder.segErrors.get(s.id)}<div class="detail">{recorder.segErrors.get(s.id)}</div>{/if}
            {:else if v === 'empty'}
              <div class="status">{t('session.seg.empty')}</div>
            {:else}
              <div class="status">{t('session.seg.notRecognized')}</div>
            {/if}
            <div class="meta">
              {#if s.durationMs}{(s.durationMs / 1000).toFixed(1)} с{/if}
              {#if recorder.segTimes.get(s.id)} · {t('session.seg.took', { s: ((recorder.segTimes.get(s.id) ?? 0) / 1000).toFixed(1) })}{/if}
              {#if s.sentToClaude} · {t('session.seg.sent')}{/if}
            </div>
          </div>
          <div class="acts">
            {#if s.audioId && (v === 'error' || v === 'none' || v === 'empty')}
              <button class="btn btn-ghost icon-btn" title={v === 'error' ? t('session.seg.retry') : t('session.seg.recognize')} onclick={() => recorder.recognize(entry.id, s)}>
                <Icon name="reroll" size={20} /><span class="act-label">{v === 'error' ? t('session.seg.retry') : t('session.seg.recognize')}</span>
              </button>
            {/if}
            {#if s.audioId}
              <button class="btn btn-ghost icon-btn" aria-label={playingId === s.id ? t('session.seg.pause') : t('session.seg.play')} onclick={() => togglePlay(s)}>
                <Icon name={playingId === s.id ? 'pause' : 'play'} size={20} />
              </button>
            {/if}
            {#if v !== 'recording'}
              <button class="btn btn-ghost icon-btn" aria-label={t('session.seg.delete')} onclick={() => recorder.removeSegment(entry.id, s.id)}>
                <Icon name="trash" size={20} />
              </button>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if anyText}
    <div class="row claude">
      <button class="btn btn-primary grow" disabled={unsent === 0} onclick={send}>
        <Icon name="share" />{t('session.claude.send', { n: unsent })}
      </button>
      <button class="btn btn-outline" onclick={copy}><Icon name="copy" />{t('session.claude.copy')}</button>
    </div>
    <button class="btn btn-outline sort" onclick={sortIntoSheet} title={t('upd.fromSessionHint')}><Icon name="sparkle" />{t('upd.fromSession')}</button>
    {#if sharedHint}
      <div class="hint-line"><Icon name="feather" size={18} />{t('session.claude.hint')}</div>
    {/if}
  {/if}

  <audio bind:this={audioEl} onended={() => (playingId = null)} onpause={() => (playingId = null)} preload="none"></audio>
</section>

<style>
  .session {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .session.live {
    box-shadow:
      inset 0 0 0 2px var(--ember),
      inset 0 0 30px rgba(120, 80, 30, 0.18),
      0 2px 12px var(--ember-glow);
  }
  header .card-title {
    margin: 0;
  }
  .engine,
  .small {
    font-size: 13px;
  }
  .idle {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 6px 0;
  }
  .big-rec {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    background: var(--t-ember);
    color: var(--parch);
    box-shadow:
      0 0 0 4px var(--ember-soft),
      0 4px 14px var(--ember-glow);
    transition: transform 0.08s;
  }
  .big-rec:active {
    transform: scale(0.95);
  }
  .big-rec.busy {
    opacity: 0.6;
    animation: pulse 1.2s infinite;
  }
  .big-label {
    font-size: 20px;
    font-weight: 700;
  }
  .rec {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .rec-head {
    flex-wrap: wrap;
  }
  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--bad);
    opacity: 0.55;
  }
  .dot.speech {
    opacity: 1;
    animation: pulse 1s infinite;
  }
  @keyframes pulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(192, 83, 63, 0.55);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(192, 83, 63, 0);
    }
  }
  .rec-label {
    font-weight: 700;
    letter-spacing: 0.08em;
  }
  .elapsed {
    font-size: 26px;
    line-height: 1;
  }
  .stop {
    min-width: 110px;
  }
  .state {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: baseline;
    min-height: 22px;
  }
  .hot {
    color: var(--bad);
  }
  .interim {
    font-style: italic;
    color: var(--ink2);
  }
  .meter {
    position: relative;
    height: 18px;
    border-radius: 9px;
    background: rgba(42, 31, 23, 0.14);
    overflow: hidden;
    box-shadow: inset 0 0 0 1px var(--edge);
  }
  .meter .fill {
    height: 100%;
    background: var(--ink2);
    transition: width 0.08s linear;
  }
  .meter .fill.above {
    background: var(--ember);
  }
  .meter .mark {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 3px;
    margin-left: -1.5px;
    background: var(--ink);
  }
  .thr {
    align-items: flex-end;
  }
  input[type='range'] {
    width: 100%;
    height: var(--tap);
    accent-color: var(--ember);
    margin: 0;
    touch-action: pan-y;
  }
  input[type='range']::-webkit-slider-thumb {
    width: 32px;
    height: 32px;
  }
  .counters {
    flex-wrap: wrap;
    gap: 6px;
  }
  .bad {
    color: var(--bad);
    font-weight: 600;
  }
  .warnline {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    font-weight: 600;
    padding: 6px 10px;
    border-radius: var(--r-sm);
    background: var(--ember-soft);
    border: 1px solid var(--ember);
  }
  .linkish {
    justify-content: flex-start;
    text-decoration: underline;
    font-size: 13.5px;
    padding: 0;
  }
  .banner,
  .issue {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    flex-wrap: wrap;
    padding: 10px 12px;
    border-radius: var(--r-sm);
    border: 1.5px solid var(--bad);
    background: rgba(192, 83, 63, 0.1);
  }
  .banner {
    align-items: center;
    border-color: var(--ember);
    background: var(--ember-soft);
  }
  .issue.gap {
    border-color: var(--ochre);
    background: rgba(156, 116, 32, 0.12);
  }
  .issue-actions {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }
  .detail {
    font-size: 12px;
    color: var(--ink2);
    word-break: break-word;
  }
  .list-head {
    margin-top: 4px;
  }
  .list-head .card-title {
    margin: 0;
  }
  .small-btn {
    min-height: 40px;
    font-size: 13.5px;
  }
  .list {
    max-height: min(52vh, 460px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2px;
    border-top: 1px solid rgba(107, 90, 72, 0.25);
    overscroll-behavior: contain;
  }
  .seg {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 8px 2px;
    border-bottom: 1px solid rgba(107, 90, 72, 0.18);
  }
  .seg.current {
    background: rgba(192, 83, 63, 0.07);
  }
  .seg.sent .text {
    color: var(--ink2);
  }
  .time {
    font-size: 14px;
    color: var(--ink2);
    padding-top: 2px;
    width: 44px;
    flex-shrink: 0;
  }
  .text {
    font-size: 16.5px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .status {
    font-size: 14px;
    color: var(--ink2);
    font-style: italic;
  }
  .status.hot {
    color: var(--bad);
    font-style: normal;
    font-weight: 600;
  }
  .meta {
    font-size: 11.5px;
    color: var(--ink2);
    margin-top: 2px;
  }
  .acts {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }
  .icon-btn {
    padding: 0 8px;
  }
  .act-label {
    font-size: 13px;
  }
  @container (max-width: 560px) {
    .act-label {
      display: none;
    }
  }
  .sort {
    width: 100%;
    margin-top: 8px;
  }
  .claude {
    flex-wrap: wrap;
  }
  .claude .btn-primary {
    min-height: 56px;
    font-size: 16px;
  }
  .hint-line {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13.5px;
    color: var(--ink2);
  }
</style>
