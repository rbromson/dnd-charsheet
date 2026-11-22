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
  import { fly, fade, slide } from 'svelte/transition';

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
        {@const open = menuFor === c.id}
        <div class="ch" class:on={c.id === charStore.current?.id} class:open>
          <button class="main" onclick={() => pick(c.id)}>
            <Portrait id={c.portraitId} name={c.name} size={56} glow={c.id === charStore.current?.id} />
            <span class="grow txt">
              <span class="nm serif">{c.name || t('chars.unnamed')}</span>
              <span class="meta">{t('chars.level', { cls: c.className, lvl: c.level })} · ❤ {c.hp.current}/{c.hp.max}</span>
            </span>
          </button>
          <button
            class="more key-tile"
            class:on={open}
            aria-label={t('chars.options')}
            aria-expanded={open}
            onclick={() => (menuFor = open ? null : c.id)}><Icon name="more" size={20} /></button
          >
          <!-- дії — розкриваються всередині картки, список не зсувається вбік -->
          {#if open}
            <div class="opts" transition:slide={{ duration: 180 }}>
              <button class="opt" title={t('chars.duplicate')} onclick={() => charStore.duplicate(c.id).then(() => (menuFor = null))}
                ><Icon name="copy" size={20} /><span>{t('chars.act.duplicate')}</span></button
              >
              <button class="opt" title={t('chars.export')} onclick={() => doExport(c.id)}
                ><Icon name="share" size={20} /><span>{t('chars.act.export')}</span></button
              >
              <button class="opt" title={t('chars.exportAi')} onclick={() => exportForAi(c.id)}
                ><Icon name="sparkle" size={20} /><span>{t('chars.act.ai')}</span></button
              >
              <button class="opt danger" title={t('chars.delete')} onclick={() => remove(c.id, c.name)}
                ><Icon name="trash" size={20} /><span>{t('chars.act.delete')}</span></button
              >
            </div>
          {/if}
        </div>
      {/each}
    </div>
    <div class="row actions">
      <button class="btn btn-outline" disabled={busy} onclick={doImport}><Icon name="upload" size={20} />{t('chars.import')}</button>
      <button class="btn btn-primary grow" onclick={() => charStore.create().then(() => (ui.switcherOpen = false))}><Icon name="plus" />{t('chars.new')}</button>
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
    /* кожа без крупных пятен (--mottle): на высокой узкой панели они читаются как камуфляж */
    background:
      radial-gradient(ellipse 90% 40% at 30% 0%, rgba(232, 116, 59, 0.12), transparent 70%),
      var(--pores),
      var(--crinkle),
      linear-gradient(180deg, #3e2b21 0%, #2e2119 45%, #23180f 100%);
    background-size: 100% 100%, 140px 140px, 300px 300px, 100% 100%;
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
    --cut: 10px;
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    padding: 6px 6px 6px 8px;
    clip-path: polygon(var(--cut) 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, var(--cut) 100%, 0 calc(100% - var(--cut)), 0 var(--cut));
  }
  /* выбранный — как активные элементы: золотая оправа, тёмное дно, уголёк слева */
  .ch.on {
    background: var(--frame-gold);
  }
  .ch.on::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    z-index: -1;
    clip-path: inherit;
    background:
      radial-gradient(ellipse 60% 120% at 0% 50%, rgba(232, 116, 59, 0.38), transparent 70%),
      radial-gradient(ellipse 120% 100% at 50% 0%, #46342a, #1d140f);
    box-shadow: inset 0 1px 0 rgba(255, 236, 200, 0.15);
  }
  .ch.on::after {
    content: '';
    position: absolute;
    left: 3px;
    top: 34px;
    width: 7px;
    height: 7px;
    transform: translateY(-50%) rotate(45deg);
    background: linear-gradient(135deg, #f3d696, #b98436);
    box-shadow: 0 0 6px rgba(240, 190, 100, 0.5);
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
  .ch {
    flex-wrap: wrap;
  }
  .more {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    margin-left: 4px;
  }
  /* раскрытая карточка невыбранного персонажа — бронзовая оправа */
  .ch.open:not(.on) {
    background: var(--frame-bronze);
  }
  .ch.open:not(.on)::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    z-index: -1;
    clip-path: inherit;
    background: radial-gradient(ellipse 120% 100% at 50% 0%, #3a2b22, #1a120e);
  }
  .opts {
    flex-basis: 100%;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin-top: 8px;
    padding-top: 10px;
    /* гравированная линия-разделитель */
    background: linear-gradient(90deg, transparent, rgba(227, 189, 115, 0.45) 20%, rgba(227, 189, 115, 0.45) 80%, transparent) top / 100% 1px no-repeat;
  }
  .opt {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 58px;
    padding: 6px 2px;
    border-radius: 3px;
    font-family: var(--font-sc);
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.02em;
    color: #e3c48a;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6);
    transition:
      background 0.15s,
      transform 0.1s;
  }
  .opt :global(svg) {
    color: var(--gold);
  }
  .opt:active {
    transform: scale(0.94);
  }
  @media (hover: hover) {
    .opt:hover {
      background: radial-gradient(ellipse 80% 90% at 50% 50%, rgba(232, 180, 90, 0.16), transparent 75%);
    }
  }
  .opt.danger,
  .opt.danger :global(svg) {
    color: #e88a74;
  }
  .actions {
    margin-top: 8px;
  }
  .tpl {
    align-self: flex-start;
    padding: 0 8px;
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
