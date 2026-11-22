<script lang="ts">
  /** Первый запуск: персонажей нет — создать нового или импортировать резервную копию. */
  import Icon from './Icon.svelte';
  import LangSwitch from './LangSwitch.svelte';
  import { charStore } from '../lib/stores/characters.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { importBackupFile } from '../lib/backup';
  import { pickFiles } from '../lib/stores/media';
  import { t } from '../lib/i18n';
  import { deliverFile, templateFile } from '../lib/template';

  async function downloadTemplate() {
    const { blob, name } = templateFile();
    await deliverFile(blob, name);
  }

  let busy = $state(false);

  async function doImport() {
    const [file] = await pickFiles('.zip,.json,application/zip,application/json', false);
    if (!file) return;
    busy = true;
    try {
      const c = await importBackupFile(file);
      await charStore.adopt(c);
      ui.toast(t('chars.imported', { name: c.name }));
    } catch (e) {
      console.error(e);
      ui.toast(t('chars.importError'));
    } finally {
      busy = false;
    }
  }
</script>

<div class="empty-wrap">
  <section class="panel box">
    <div class="crest"><Icon name="dice" size={44} stroke={1.4} /></div>
    <h1 class="sc">{t('empty.title')}</h1>
    <p>{t('empty.text')}</p>
    <div class="acts">
      <button class="btn btn-primary" onclick={() => charStore.create()}><Icon name="plus" />{t('chars.new')}</button>
      <button class="btn btn-outline" disabled={busy} onclick={doImport}><Icon name="upload" size={20} />{t('chars.import')}</button>
      <button class="btn btn-ghost" onclick={downloadTemplate}><Icon name="download" size={20} />{t('tpl.button')}</button>
    </div>
    <p class="small">{t('tpl.hint')}</p>
    <button class="btn btn-ghost help" onclick={() => (ui.tutorialOpen = true)}><Icon name="eye" size={18} />{t('tut.open')}</button>
    <LangSwitch />
  </section>
</div>

<style>
  .empty-wrap {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
  }
  .box {
    width: min(440px, 100%);
    padding: 32px 28px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: center;
    animation: rise 0.5s var(--ease) both;
  }
  .crest {
    align-self: center;
    width: 84px;
    height: 84px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ember);
    background: radial-gradient(circle at 50% 40%, rgba(232, 116, 59, 0.22), rgba(0, 0, 0, 0.25));
    box-shadow:
      inset 0 0 0 1.5px rgba(214, 170, 110, 0.4),
      0 0 30px rgba(232, 116, 59, 0.25);
  }
  h1 {
    font-size: 26px;
    color: var(--parch);
  }
  p {
    margin: 0;
    color: var(--muted);
  }
  .help {
    align-self: center;
    color: var(--ember);
  }
  .small {
    font-size: 12.5px;
    margin-top: -6px;
  }
  .acts {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .box :global(.ls) {
    text-align: left;
    margin-top: 6px;
  }
</style>
