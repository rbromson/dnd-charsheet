<script lang="ts">
  import Icon from './Icon.svelte';
  import Portrait from './Portrait.svelte';
  import Toggle from './Toggle.svelte';
  import LangSwitch from './LangSwitch.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { charStore } from '../lib/stores/characters.svelte';
  import { exportCharacter, importBackupFile } from '../lib/backup';
  import { pickFiles } from '../lib/stores/media';
  import { t } from '../lib/i18n';
  import { deliverFile, templateFile } from '../lib/template';
  import { digestFor } from '../lib/digest';
  import { shareOrCopy } from '../lib/session/share';
  import { journal } from '../lib/stores/journal.svelte';
  import { codex } from '../lib/stores/codex.svelte';

  async function exportForAi(id: string) {
    menuFor = null;
    await Promise.all([charStore.flush(), journal.flush(), codex.flush()]);
    const { name, text } = await digestFor(id);
    const r = await shareOrCopy(text, name || t('chars.unnamed'));
    if (r === 'copied') ui.toast(t('chars.aiCopied'));
    else if (r === 'failed') ui.toast(t('session.claude.failed'));
  }
  import { fly, fade } from 'svelte/transition';

  let menuFor = $state<string | null>(null);
  let withAudio = $state(false);
  let busy = $state(false);

  async function pick(id: string) {
    menuFor = null;
    if (id !== charStore.current?.id) await charStore.select(id);
    ui.switcherOpen = false;
  }

  async function remove(id: string, name: string) {
    menuFor = null;
    const ok = await ui.confirm(t('chars.deleteConfirm', { name: name || t('chars.unnamed') }), { danger: true, okLabel: t('common.delete') });
    if (ok) await charStore.remove(id);
  }

  async function doExport(id: string) {
    menuFor = null;
    busy = true;
    try {
      await exportCharacter(id, { audio: withAudio });
    } catch (e) {
      console.error(e);
    } finally {
      busy = false;
    }
  }

  async function doImport() {
    const [file] = await pickFiles('.zip,.json,application/zip,application/json', false);
    if (!file) return;
    busy = true;
    try {
      const c = await importBackupFile(file);
      await charStore.adopt(c);
      ui.toast(t('chars.imported', { name: c.name }));
      ui.switcherOpen = false;
    } catch (e) {
      console.error(e);
      ui.toast(t('chars.importError'));
    } finally {
      busy = false;
    }
  }
</script>

{#if ui.switcherOpen}
  <div class="scrim" role="presentation" transition:fade={{ duration: 120 }} onclick={() => (ui.switcherOpen = false)}></div>
  <aside class="sw" transition:fly={{ x: -60, duration: 180 }}>
    <div class="head">
      <h2 class="sc">{t('chars.title')}</h2>
      <button class="btn btn-ghost" aria-label={t('common.close')} onclick={() => (ui.switcherOpen = false)}><Icon name="close" /></button>
    </div>
    <div class="list">
      {#each charStore.list as c (c.id)}
        <div class="ch" class:on={c.id === charStore.current?.id}>
          <button class="main" onclick={() => pick(c.id)}>
            <Portrait id={c.portraitId} name={c.name} size={56} glow={c.id === charStore.current?.id} />
            <span class="grow txt">
              <span class="nm serif">{c.name || t('chars.unnamed')}</span>
              <span class="meta">{t('chars.level', { cls: c.className, lvl: c.level })} · ❤ {c.hp.current}/{c.hp.max}</span>
            </span>
          </button>
          <button class="btn btn-ghost" aria-label="…" onclick={() => (menuFor = menuFor === c.id ? null : c.id)}><Icon name="more" /></button>
        </div>
        {#if menuFor === c.id}
          <div class="menu" transition:fade={{ duration: 100 }}>
            <button onclick={() => charStore.duplicate(c.id).then(() => (menuFor = null))}><Icon name="copy" size={20} />{t('chars.duplicate')}</button>
            <button onclick={() => doExport(c.id)}><Icon name="share" size={20} />{t('chars.export')}</button>
            <button onclick={() => exportForAi(c.id)}><Icon name="sparkle" size={20} />{t('chars.exportAi')}</button>
            <button class="danger" onclick={() => remove(c.id, c.name)}><Icon name="trash" size={20} />{t('chars.delete')}</button>
          </div>
        {/if}
      {/each}
    </div>
    <div class="row actions">
      <button class="btn btn-primary grow" onclick={() => charStore.create().then(() => (ui.switcherOpen = false))}><Icon name="plus" />{t('chars.new')}</button>
      <button class="btn btn-outline" disabled={busy} onclick={doImport}><Icon name="upload" size={20} />{t('chars.import')}</button>
    </div>
    <button class="btn btn-ghost tpl" onclick={() => deliverFile(templateFile().blob, templateFile().name)}><Icon name="download" size={20} />{t('tpl.button')}</button>
    <p class="hint">{t('tpl.hint')}</p>
    <Toggle bind:checked={withAudio} label={t('chars.exportAudio')} />
    <p class="hint">{t('chars.hint')}</p>
    <div class="sp"></div>
    <button class="btn btn-ghost tpl" onclick={() => ((ui.switcherOpen = false), (ui.tutorialOpen = true))}><Icon name="eye" size={20} />{t('tut.open')}</button>
    <LangSwitch />
  </aside>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0 0 0 96px;
    background: rgba(8, 5, 4, 0.55);
    z-index: 30;
  }
  .sw {
    position: fixed;
    left: 96px;
    top: 0;
    bottom: 0;
    width: min(400px, calc(100vw - 96px));
    background:
      radial-gradient(ellipse 90% 40% at 30% 0%, rgba(232, 116, 59, 0.12), transparent 70%),
      var(--leather);
    background-size: 100% 100%, var(--leather-size);
    border-right: 1px solid var(--line);
    box-shadow: 20px 0 40px rgba(0, 0, 0, 0.5);
    z-index: 31;
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h2 {
    font-size: 24px;
    color: var(--parch);
    text-shadow: 0 0 24px rgba(232, 116, 59, 0.2);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ch {
    display: flex;
    align-items: center;
    border-radius: 14px;
    border: 1.5px solid transparent;
    padding: 6px;
  }
  .ch.on {
    background: linear-gradient(100deg, rgba(232, 116, 59, 0.2), rgba(232, 116, 59, 0.06));
    border-color: var(--ember);
    box-shadow: 0 0 22px -6px var(--ember-glow);
  }
  .main {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: left;
    min-height: var(--tap);
    min-width: 0;
  }
  .txt {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .nm {
    font-weight: 700;
    font-size: 19px;
    color: var(--parch);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .meta {
    font-size: 12.5px;
    color: var(--muted);
  }
  .menu {
    margin: 0 0 4px 70px;
    background: var(--bg3);
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 6px;
    display: flex;
    flex-direction: column;
  }
  .menu button {
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 10px;
    border-radius: 8px;
    color: #d9c7aa;
    text-align: left;
  }
  .menu .danger {
    color: #e07a66;
  }
  .actions {
    margin-top: 8px;
  }
  .tpl {
    align-self: flex-start;
    padding: 0 8px;
    color: var(--ember);
  }
  .sp {
    flex: 1;
  }
  .hint {
    font-size: 12px;
    color: var(--muted);
    margin: 0;
  }
  @media (max-width: 640px) {
    .scrim {
      inset: 0;
    }
    .sw {
      left: 0;
      width: 100vw;
      padding-bottom: calc(20px + env(safe-area-inset-bottom));
    }
  }
</style>
