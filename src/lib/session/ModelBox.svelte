<script lang="ts">
  /** Состояние модели Whisper + «Завантажити модель» (никогда не качаем сами). */
  import { onMount } from 'svelte';
  import { t } from '../i18n';
  import { ui } from '../stores/ui.svelte';
  import { recorder } from './recorder.svelte';
  import { whisper } from './engines/whisper.svelte';
  import { WHISPER_MODELS } from './settings';

  let { manage = false }: { manage?: boolean } = $props();

  const s = $derived(recorder.settings);
  const mine = $derived(whisper.isFor(s.whisperModel, s.whisperDevice));
  const status = $derived(mine ? whisper.status : 'unknown');
  const info = $derived(WHISPER_MODELS[s.whisperModel]);
  const mb = $derived(s.whisperDevice === 'webgpu' ? info.sizeMbGpu : info.sizeMb);
  const busy = $derived(status === 'downloading' || status === 'loading' || status === 'checking');

  onMount(() => {
    void recorder.ensureSettings();
  });

  // при смене модели/устройства в настройках — перепроверить кеш
  $effect(() => {
    const m = s.whisperModel;
    const d = s.whisperDevice;
    if (recorder.settingsLoaded && !whisper.isFor(m, d) && !busy) void whisper.check(m, d);
  });

  async function remove() {
    const ok = await ui.confirm(t('session.model.delete') + '?', { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    const err = await whisper.clear(s.whisperModel, s.whisperDevice);
    ui.toast(err || t('session.model.deleted'));
  }

  const mbOf = (b: number) => (b / 1024 / 1024).toFixed(0);
</script>

<div class="model" class:warn={status === 'absent' || status === 'error'}>
  <div class="row">
    <div class="grow">
      <div class="label">{t('session.model.title')} · {s.whisperModel}</div>
      <div class="state">
        {#if status === 'ready'}{t('session.model.ready')}
        {:else if status === 'cached'}{t('session.model.cached')}
        {:else if status === 'absent'}{t('session.model.absent')}
        {:else if status === 'checking'}{t('session.model.checking')}
        {:else if status === 'loading'}{t('session.model.loading')}
        {:else if status === 'downloading'}{t('session.model.downloading', { p: Math.floor(whisper.progress) })}
        {:else if status === 'error'}{t('session.model.error')}
        {:else}{t('session.model.unknown')}{/if}
      </div>
    </div>
    {#if status === 'absent' || status === 'error' || status === 'unknown'}
      <button class="btn btn-ink" onclick={() => recorder.downloadModel()}>{t('session.model.download', { mb })}</button>
    {:else if manage && (status === 'ready' || status === 'cached')}
      <button class="btn btn-outline" onclick={remove}>{t('session.model.delete')}</button>
    {/if}
  </div>

  {#if status === 'downloading' || status === 'loading'}
    <div class="bar"><div class="fill" style:width="{Math.max(2, whisper.progress)}%"></div></div>
    {#if whisper.totalBytes > 0}
      <div class="small muted">{t('session.model.bytes', { loaded: mbOf(whisper.loadedBytes), total: mbOf(whisper.totalBytes) })}</div>
    {/if}
  {/if}
  {#if status === 'absent' || status === 'unknown'}
    <div class="small muted">{t('session.model.sizeWarn', { mb })}</div>
  {/if}
  {#if status === 'error' && whisper.error}
    <div class="small err">{whisper.error}</div>
  {/if}
  {#if recorder.queue.length > 0 && status !== 'ready'}
    <div class="small"><b>{t('session.model.waiting', { n: recorder.queue.length })}</b></div>
  {/if}
  {#if status === 'ready' && whisper.lastRunMs > 0}
    <div class="small muted">
      {t('session.model.speed', { audio: (whisper.lastAudioMs / 1000).toFixed(1), run: (whisper.lastRunMs / 1000).toFixed(1) })}
    </div>
  {/if}
</div>

<style>
  .model {
    border: 1px solid var(--edge);
    border-radius: var(--r-sm);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: rgba(255, 255, 255, 0.18);
  }
  .model.warn {
    border-color: var(--ember);
    background: var(--ember-soft);
  }
  .state {
    font-weight: 600;
  }
  .small {
    font-size: 13px;
  }
  .err {
    color: var(--bad);
    word-break: break-word;
  }
  .bar {
    height: 8px;
    border-radius: 4px;
    background: rgba(42, 31, 23, 0.15);
    overflow: hidden;
  }
  .fill {
    height: 100%;
    background: var(--ember);
    transition: width 0.3s;
  }
  .row {
    flex-wrap: wrap;
  }
</style>
