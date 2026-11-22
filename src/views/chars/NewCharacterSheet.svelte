<script lang="ts">
  /**
   * «Новий персонаж»: вручну, через ШІ (инструкция → ответ JSON → персонаж) или из файла.
   * Через ШІ устроено как «ШІ → аркуш»: отдать инструкцию, вставить ответ.
   */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { pickFiles } from '../../lib/stores/media';
  import { importBackupFile, importManifest, type BackupManifest } from '../../lib/backup';
  import { buildCreatePrompt, deliverFile, templateFile } from '../../lib/template';
  import { extractJson } from '../../lib/update';
  import { shareOrCopy, copyText } from '../../lib/session/share';
  import { t } from '../../lib/i18n';
  import type { Character } from '../../lib/model/types';

  let mode = $state<'choose' | 'ai'>('choose');
  let raw = $state('');
  let busy = $state(false);

  async function done(c: Character) {
    await charStore.adopt(c);
    ui.toast(t('chars.imported', { name: c.name }));
    ui.closeSheet();
    ui.switcherOpen = false;
  }

  async function manual() {
    await charStore.create();
    ui.closeSheet();
    ui.switcherOpen = false;
  }

  async function fromFile() {
    const [file] = await pickFiles('.zip,.json,application/zip,application/json', false);
    if (!file) return;
    busy = true;
    try {
      await done(await importBackupFile(file));
    } catch (e) {
      console.error(e);
      ui.toast(t('chars.importError'));
    } finally {
      busy = false;
    }
  }

  async function share() {
    const r = await shareOrCopy(buildCreatePrompt(), t('newc.title'));
    if (r === 'copied') ui.toast(t('upd.copied'));
  }
  async function copy() {
    if (await copyText(buildCreatePrompt())) ui.toast(t('upd.copied'));
  }
  async function downloadTemplate() {
    const { blob, name } = templateFile();
    await deliverFile(blob, name);
  }

  async function paste() {
    try {
      raw = await navigator.clipboard.readText();
    } catch {
      ui.toast(t('upd.pasteDenied'));
    }
  }
  async function answerFile() {
    const [f] = await pickFiles('.json,application/json,text/plain', false);
    if (f) raw = await f.text();
  }

  async function create() {
    let data: Record<string, unknown>;
    try {
      const parsed = extractJson(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
      data = parsed as Record<string, unknown>;
    } catch {
      ui.toast(t('newc.parseError'), undefined, 6000);
      return;
    }
    busy = true;
    try {
      const manifest: BackupManifest =
        data.app === 'taverna'
          ? (data as unknown as BackupManifest)
          : { app: 'taverna', version: 1, exportedAt: '', character: data as unknown as Character, journal: [], codex: [], media: [] };
      await done(await importManifest(manifest, new Map()));
    } catch (e) {
      console.error(e);
      ui.toast(t('newc.parseError'), undefined, 6000);
    } finally {
      busy = false;
    }
  }
</script>

<SheetFrame kicker={t('newc.kicker')} title={t('newc.title')}>
  {#if mode === 'choose'}
    <div class="ways">
      <button class="way" onclick={manual}>
        <span class="medal"><Icon name="edit" size={22} /></span>
        <span class="wt"><b>{t('newc.manual')}</b><span>{t('newc.manualSub')}</span></span>
      </button>
      <button class="way ai" onclick={() => (mode = 'ai')}>
        <span class="medal"><Icon name="sparkle" size={22} /></span>
        <span class="wt"><b>{t('newc.ai')}</b><span>{t('newc.aiSub')}</span></span>
        <Icon name="chevron" size={18} />
      </button>
      <button class="way" disabled={busy} onclick={fromFile}>
        <span class="medal"><Icon name="upload" size={22} /></span>
        <span class="wt"><b>{t('newc.file')}</b><span>{t('newc.fileSub')}</span></span>
      </button>
    </div>
  {:else}
    <section class="step">
      <h3 class="card-title">{t('newc.step1')}</h3>
      <p class="hint">{t('newc.step1Hint')}</p>
      <div class="row">
        <button class="btn btn-ink grow" onclick={share}><Icon name="share" size={18} />{t('upd.share')}</button>
        <button class="btn btn-outline" onclick={copy}><Icon name="copy" size={18} />{t('upd.copy')}</button>
      </div>
      <button class="btn btn-ghost tplb" onclick={downloadTemplate}><Icon name="download" size={18} />{t('newc.template')}</button>
    </section>
    <section class="step">
      <h3 class="card-title">{t('newc.step2')}</h3>
      <textarea class="field" rows="6" placeholder={t('newc.placeholder')} bind:value={raw}></textarea>
      <div class="row wrap">
        <button class="btn btn-outline" onclick={paste}><Icon name="copy" size={18} />{t('upd.paste')}</button>
        <button class="btn btn-outline" onclick={answerFile}><Icon name="upload" size={18} />{t('upd.file')}</button>
      </div>
    </section>
  {/if}

  {#snippet footer()}
    {#if mode === 'ai'}
      <button class="btn btn-outline" onclick={() => (mode = 'choose')}><Icon name="back" size={18} />{t('upd.back')}</button>
      <button class="btn btn-primary grow" disabled={!raw.trim() || busy} onclick={create}><Icon name="check" size={18} />{t('newc.create')}</button>
    {/if}
  {/snippet}
</SheetFrame>

<style>
  .ways {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  /* способ создания — табличка в бронзовой оправе со срезанными углами */
  .way {
    --cut: 9px;
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 76px;
    padding: 10px 14px;
    text-align: left;
    color: var(--ink);
    clip-path: polygon(var(--cut) 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, var(--cut) 100%, 0 calc(100% - var(--cut)), 0 var(--cut));
    background: var(--frame-bronze);
    transition: transform 0.1s;
  }
  .way::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    z-index: -1;
    clip-path: inherit;
    background: radial-gradient(ellipse 120% 100% at 50% 0%, #fffaf0 0%, #f3e6cb 55%, #e6d3ad 100%);
    box-shadow: inset 0 -6px 10px -6px rgba(110, 78, 40, 0.3);
  }
  .way:active {
    transform: scale(0.98);
  }
  .way[disabled] {
    opacity: 0.5;
  }
  .way.ai {
    background: var(--frame-gold);
  }
  .way.ai::before {
    background:
      radial-gradient(ellipse 60% 120% at 0% 50%, rgba(232, 116, 59, 0.22), transparent 70%),
      radial-gradient(ellipse 120% 100% at 50% 0%, #fffaf0 0%, #f6e7c6 55%, #ead3a4 100%);
  }
  .medal {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffd9a8;
    background: radial-gradient(circle at 50% 35%, #4a372b, #1d140f);
    box-shadow:
      0 0 0 2px #b08a4a,
      0 2px 4px rgba(60, 40, 15, 0.4);
  }
  .way.ai .medal {
    color: #fff0d6;
    background: radial-gradient(circle at 50% 35%, #f39a5c, #b0481c);
    box-shadow:
      0 0 0 2px #e3bd73,
      0 0 12px rgba(232, 116, 59, 0.45);
  }
  .wt {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .wt b {
    font-family: var(--font-sc);
    font-size: 17px;
  }
  .wt span {
    font-size: 13px;
    line-height: 1.35;
    color: var(--ink2);
  }
  .step {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .step + .step {
    margin-top: 14px;
  }
  .hint {
    margin: 0;
    font-size: 13.5px;
    color: var(--ink2);
  }
  .tplb {
    align-self: flex-start;
    padding: 0 6px;
    font-size: 14px;
  }
  .row.wrap {
    flex-wrap: wrap;
  }
  textarea {
    font-size: 14px;
  }
</style>
