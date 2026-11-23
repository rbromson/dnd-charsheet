<script lang="ts">
  /**
   * «Новий персонаж»: вручну, через ШІ (инструкция → ответ JSON → персонаж) или из файла.
   * Через ШІ устроено как «ШІ → аркуш»: отдать инструкцию, вставить ответ.
   */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import Icon from '../../components/Icon.svelte';
  import Ways from '../../components/Ways.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { pickFiles } from '../../lib/stores/media';
  import { importBackupFile, importManifest } from '../../lib/backup';
  import { manifestFromAiText } from '../../lib/aiImport';
  import { buildCreatePrompt, deliverFile, templateFile } from '../../lib/template';
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
    // разбор ответа — в lib/aiImport (с тестами): копия, обёртка { character } или сам персонаж
    const manifest = manifestFromAiText(raw);
    if (!manifest) {
      ui.toast(t('newc.parseError'), undefined, 6000);
      return;
    }
    busy = true;
    try {
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
    <Ways
      ways={[
        { icon: 'edit', label: t('newc.manual'), sub: t('newc.manualSub'), onclick: manual },
        { icon: 'sparkle', label: t('newc.ai'), sub: t('newc.aiSub'), onclick: () => (mode = 'ai'), accent: true, next: true },
        { icon: 'upload', label: t('newc.file'), sub: t('newc.fileSub'), onclick: fromFile, disabled: busy },
      ]}
    />
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
      <button class="btn btn-outline" onclick={() => (mode = 'choose')}><Icon name="back" size={18} />{t('common.back')}</button>
      <button class="btn btn-primary grow" disabled={!raw.trim() || busy} onclick={create}><Icon name="check" size={18} />{t('newc.create')}</button>
    {/if}
  {/snippet}
</SheetFrame>

<style>
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
