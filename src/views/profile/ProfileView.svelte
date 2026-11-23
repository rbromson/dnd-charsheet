<script lang="ts">
  import TopBar from '../../components/TopBar.svelte';
  import Portrait from '../../components/Portrait.svelte';
  import TextField from '../../components/TextField.svelte';
  import Secret from '../../components/Secret.svelte';
  import Icon from '../../components/Icon.svelte';
  import TextCard from './TextCard.svelte';
  import { HEADER_KEYS, TRAIT_KEYS } from './fields';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { putMedia, resizeImage, pickFiles } from '../../lib/stores/media';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  const meta = $derived(
    [c.race, c.className.trim() ? `${c.className} ${c.level}` : '', c.background].filter((x) => x && x.trim()).join(' · '),
  );
  let busy = $state(false);

  async function uploadPortrait() {
    const charId = c.id;
    const [file] = await pickFiles('image/*', false);
    if (!file) return;
    busy = true;
    try {
      const blob = await resizeImage(file, 1600);
      const id = await putMedia(charId, blob, 'image');
      const cur = charStore.current;
      if (!cur || cur.id !== charId) return;
      cur.gallery.push(id);
      cur.portraitId = id;
      ui.toast(t('gallery.portraitSet'));
    } finally {
      busy = false;
    }
  }

  function clearPortrait() {
    charStore.update(
      (ch) => {
        ch.portraitId = null;
      },
      { undo: t('profile.portraitCleared') },
    );
  }
</script>

<TopBar title={t('nav.profile')} />
<div class="view">
  <div class="cols cols-3">
    <div class="stack">
      <section class="card ident">
        <!-- великий портрет зверху, ім'я під ним -->
        <div class="top">
          <button class="pic" aria-label={t('profile.portraitUpload')} disabled={busy} onclick={uploadPortrait}>
            <Portrait id={c.portraitId} name={c.name} size={200} />
            <span class="cam"><Icon name="camera" size={16} /></span>
          </button>
          <div class="who">
            {#if ui.editing}
              <TextField bind:value={c.name} label={t('profile.name')} serif />
            {:else}
              <h2 class="serif nm">{c.name.trim() || t('chars.unnamed')}</h2>
            {/if}
            {#if meta}<div class="meta">{meta}</div>{/if}
          </div>
        </div>
        {#if ui.editing}
          <div class="pbtns">
            <button class="btn btn-outline" disabled={busy} onclick={uploadPortrait}>
              <Icon name="camera" size={20} />{busy ? '…' : t('profile.portraitUpload')}
            </button>
            {#if c.portraitId}
              <button class="btn btn-ghost danger" onclick={clearPortrait}><Icon name="close" size={20} />{t('profile.portraitClear')}</button>
            {/if}
          </div>
        {/if}
        <div class="fields">
          {#each HEADER_KEYS as k (k)}
            {#if ui.editing}
              <TextField bind:value={c.profile[k]} label={t(`profile.${k}`)} />
            {:else}
              <div class="f">
                <span class="label">{t(`profile.${k}`)}</span>
                <span class="v serif" class:none={!c.profile[k].trim()}>{c.profile[k].trim() || '—'}</span>
              </div>
            {/if}
          {/each}
        </div>
      </section>

      <TextCard target={{ group: 'profile', key: 'appearance' }} bind:value={c.profile.appearance} rows={5} />

      <section class="card">
        {#if !ui.editing}<h2 class="card-title">{t('profile.secret')}</h2>{/if}
        {#if ui.editing || c.secret.trim()}
          <Secret bind:value={c.secret} editable={ui.editing} label={t('profile.secret')} />
        {:else}
          <div class="hint">{t('profile.secretEmpty')}</div>
        {/if}
      </section>
    </div>

    <div class="stack">
      <TextCard target={{ group: 'profile', key: 'backstory' }} bind:value={c.profile.backstory} rows={8} />
      <TextCard target={{ group: 'profile', key: 'allies' }} bind:value={c.profile.allies} />
      <TextCard target={{ group: 'profile', key: 'otherFeatures' }} bind:value={c.profile.otherFeatures} />
      <TextCard target={{ group: 'profile', key: 'treasure' }} bind:value={c.profile.treasure} />
    </div>

    <div class="stack">
      {#each TRAIT_KEYS as k (k)}
        <TextCard target={{ group: 'traits', key: k }} bind:value={c.traits[k]} rows={3} />
      {/each}
    </div>
  </div>

  {#if !ui.editing}
    <p class="foot muted">{t('profile.holdToEdit')}</p>
  {/if}
</div>

<style>
  .ident {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .top {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }
  .pic {
    position: relative;
    display: flex;
    border-radius: 50%;
  }
  .pic:active {
    transform: scale(0.98);
  }
  .cam {
    position: absolute;
    right: 10px;
    bottom: 10px;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffe6b8;
    background: radial-gradient(circle at 50% 35%, #4a372b, #1d140f);
    box-shadow: 0 0 0 2px #c89a4e, 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  .who {
    width: 100%;
    min-width: 0;
  }
  .nm {
    font-size: 30px;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
  .meta {
    margin-top: 4px;
    font-size: 13.5px;
    color: var(--ink2);
  }
  .pbtns {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
  .danger {
    color: var(--bad);
  }
  .fields {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px 12px;
  }
  .f {
    display: flex;
    flex-direction: column;
    min-width: 0;
    padding-bottom: 4px;
    border-bottom: 1px dashed rgba(107, 90, 72, 0.3);
  }
  .f .label {
    margin: 0;
  }
  .v {
    font-size: 17px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .v.none {
    color: var(--ink2);
    font-weight: 500;
  }
  .hint {
    font-size: 13px;
    color: var(--ink2);
    margin: 8px 0 0;
  }
  .foot {
    font-size: 13px;
    text-align: center;
    margin: 0;
  }
</style>
