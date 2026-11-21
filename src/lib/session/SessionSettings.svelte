<script lang="ts">
  /** Боковая карточка настроек записи сессии. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import Segmented from '../../components/Segmented.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import { t } from '../i18n';
  import { recorder } from './recorder.svelte';
  import ModelBox from './ModelBox.svelte';
  import type { EngineId, SessionLang, WhisperDevice, WhisperModelId } from './settings';

  const s = $derived(recorder.settings);

  const engines: { value: EngineId; label: string }[] = [
    { value: 'webspeech', label: t('session.engine.webspeech') },
    { value: 'whisper', label: t('session.engine.whisper') },
    { value: 'none', label: t('session.engine.none') },
  ];
  const langs: { value: SessionLang; label: string }[] = [
    { value: 'uk', label: t('session.lang.uk') },
    { value: 'ru', label: t('session.lang.ru') },
    { value: 'en', label: t('session.lang.en') },
  ];
  const models: { value: WhisperModelId; label: string }[] = [
    { value: 'tiny', label: 'Tiny' },
    { value: 'base', label: 'Base' },
    { value: 'small', label: 'Small' },
  ];
  const devices: { value: WhisperDevice; label: string }[] = [
    { value: 'wasm', label: t('session.device.wasm') },
    { value: 'webgpu', label: t('session.device.webgpu') },
  ];
</script>

<SheetFrame kicker={t('session.set.kicker')} title={t('session.settings')}>
  {#if recorder.status !== 'idle'}
    <div class="note">{t('session.set.appliesNext')}</div>
  {/if}

  <div>
    <span class="label">{t('session.set.engine')}</span>
    <div class="stack-tight">
      {#each engines as e (e.value)}
        <button class="choice" class:on={s.engine === e.value} onclick={() => recorder.update({ engine: e.value })}>
          <span class="dot"></span>
          <span class="grow">
            <b>{e.label}</b>
            <small>{t(`session.set.hint.${e.value}`)}</small>
          </span>
        </button>
      {/each}
    </div>
  </div>

  <div>
    <span class="label">{t('session.set.language')}</span>
    <Segmented value={s.language} options={langs} onchange={(v) => recorder.update({ language: v })} />
  </div>

  <div>
    <Toggle
      checked={s.keepAudio || s.engine === 'none'}
      label={t('session.set.keepAudio')}
      onchange={(v) => recorder.update({ keepAudio: v })}
    />
    <div class="hint">{s.engine === 'none' ? t('session.set.noneKeeps') : t('session.set.keepAudioHint')}</div>
  </div>

  <div>
    <span class="label">{t('session.model.title')}</span>
    <Segmented value={s.whisperModel} options={models} onchange={(v) => recorder.update({ whisperModel: v })} />
    <div class="hint">{t(`session.model.${s.whisperModel}`)}</div>
  </div>
  <div>
    <span class="label">{t('session.set.device')}</span>
    <Segmented value={s.whisperDevice} options={devices} onchange={(v) => recorder.update({ whisperDevice: v })} />
    <div class="hint">{t('session.set.deviceHint')}</div>
  </div>
  <ModelBox manage />

  <div>
    <span class="label">{t('session.set.mic')}</span>
    <Toggle checked={s.noiseSuppression} label={t('session.set.noiseSuppression')} onchange={(v) => recorder.update({ noiseSuppression: v })} />
    <Toggle checked={s.autoGain} label={t('session.set.autoGain')} onchange={(v) => recorder.update({ autoGain: v })} />
    <Toggle checked={s.webspeechGate} label={t('session.set.gate')} onchange={(v) => recorder.update({ webspeechGate: v })} />
    <div class="hint">{t('session.set.gateHint')}</div>
  </div>
</SheetFrame>

<style>
  .stack-tight {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .choice {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    text-align: left;
    min-height: var(--tap);
    padding: 10px 12px;
    border-radius: var(--r-sm);
    border: 1.5px solid var(--edge);
    width: 100%;
  }
  .choice.on {
    border-color: var(--ink);
    background: rgba(42, 31, 23, 0.07);
  }
  .choice b {
    display: block;
  }
  .choice small {
    display: block;
    color: var(--ink2);
    font-size: 12.5px;
    line-height: 1.35;
    margin-top: 2px;
  }
  .dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--ink2);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .on .dot {
    border-color: var(--ember);
    background: radial-gradient(circle, var(--ember) 45%, transparent 50%);
  }
  .hint {
    font-size: 12.5px;
    color: var(--ink2);
    margin-top: 4px;
    line-height: 1.35;
  }
  .note {
    font-size: 13px;
    padding: 8px 10px;
    border-radius: var(--r-sm);
    background: var(--ember-soft);
    border: 1px solid var(--ember);
  }
</style>
