<script lang="ts">
  /** Четыре цветные плитки: КО, ініціатива, швидкість, бонус майстерності. Общие для «Аркуш» и «Бій». */
  import Icon from '../../components/Icon.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import TileSheet from './TileSheet.svelte';
  import { press } from '../../lib/actions/press';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { fmt, initiative, profBonus } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  const open = (kind: 'ac' | 'init' | 'speed' | 'prof') => ui.openSheet(TileSheet, { kind });

  function rollInit() {
    dice.rollCheck({ kind: 'init', label: t('sheet.tile.init'), bonus: initiative(c) });
  }
</script>

<div class="tiles">
  <!-- КО -->
  {#if ui.editing}
    <div class="tile t-ac">
      <span class="ic"><Icon name="shield" size={20} /></span><span class="wm" aria-hidden="true"><Icon name="shield" size={86} stroke={1.4} /></span>
      <div class="k">{t('sheet.tile.ac')}</div>
      <div class="inline">
        <NumberField bind:value={c.ac} min={0} max={50} />
        <input class="field note" type="text" placeholder={t('sheet.acNotePh')} bind:value={c.acNote} enterkeyhint="done" />
      </div>
    </div>
  {:else}
    <button class="tile t-ac" use:press={{ onLong: () => open('ac') }}>
      <span class="ic"><Icon name="shield" size={20} /></span><span class="wm" aria-hidden="true"><Icon name="shield" size={86} stroke={1.4} /></span>
      <div class="k">{t('sheet.tile.ac')}</div>
      <div class="v">{c.ac}</div>
      <div class="s">{c.acNote || ' '}</div>
    </button>
  {/if}

  <!-- Ініціатива -->
  <button
    class="tile t-init"
    use:press={{ onTap: () => (ui.editing ? open('init') : rollInit()), onLong: () => open('init') }}
  >
    <span class="ic"><Icon name="bolt" size={20} /></span><span class="wm" aria-hidden="true"><Icon name="bolt" size={86} stroke={1.4} /></span>
    <div class="k">{t('sheet.tile.init')}</div>
    <div class="v">{fmt(initiative(c))}</div>
    <div class="s">{ui.editing ? t('sheet.tile.tapEdit') : t('sheet.tile.tapRoll')}</div>
  </button>

  <!-- Швидкість -->
  {#if ui.editing}
    <div class="tile t-speed">
      <span class="ic"><Icon name="boot" size={20} /></span><span class="wm" aria-hidden="true"><Icon name="boot" size={86} stroke={1.4} /></span>
      <div class="k">{t('sheet.tile.speed')}</div>
      <div class="inline">
        <input class="field speed" type="text" inputmode="text" placeholder={t('sheet.speedPh')} bind:value={c.speed} enterkeyhint="done" />
      </div>
      <div class="s">{t('sheet.tile.feet')}</div>
    </div>
  {:else}
    <button class="tile t-speed" use:press={{ onLong: () => open('speed') }}>
      <span class="ic"><Icon name="boot" size={20} /></span><span class="wm" aria-hidden="true"><Icon name="boot" size={86} stroke={1.4} /></span>
      <div class="k">{t('sheet.tile.speed')}</div>
      <div class="v" class:long={c.speed.length > 4}>{c.speed || '—'}</div>
      <div class="s">{t('sheet.tile.feet')}</div>
    </button>
  {/if}

  <!-- Бонус майстерності -->
  <button class="tile t-prof" use:press={{ onTap: () => ui.editing && open('prof'), onLong: () => open('prof') }}>
    <span class="ic"><Icon name="clock" size={20} /></span><span class="wm" aria-hidden="true"><Icon name="clock" size={86} stroke={1.4} /></span>
    <div class="k">{t('sheet.tile.prof')}</div>
    <div class="v">{fmt(profBonus(c))}</div>
    <div class="s">
      {#if ui.editing}{t('sheet.tile.tapEdit')}{:else}{c.profBonusOverride == null ? t('sheet.tile.profAuto') : t('sheet.tile.manual')}{/if}
    </div>
  </button>
</div>

<style>
  .tiles {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  @container (max-width: 520px) {
    .tiles {
      grid-template-columns: 1fr 1fr;
    }
  }
  .tile {
    position: relative;
    border-radius: var(--r);
    padding: 10px 14px;
    min-height: 92px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 2px;
    color: var(--parch3);
    text-align: left;
    overflow: hidden;
    user-select: none;
    isolation: isolate;
    box-shadow:
      inset 0 1px 0 rgba(255, 235, 210, 0.28),
      inset 0 -2px 0 rgba(0, 0, 0, 0.18),
      inset 0 0 0 1px rgba(0, 0, 0, 0.12),
      0 10px 22px -10px rgba(0, 0, 0, 0.8);
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
    transition:
      transform 0.12s var(--ease),
      filter 0.15s;
  }
  /* зерно + блик сверху */
  .tile::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      var(--dust),
      radial-gradient(ellipse 90% 70% at 20% 0%, rgba(255, 240, 220, 0.22), transparent 60%);
    background-size: 240px 240px, 100% 100%;
    mix-blend-mode: soft-light;
    pointer-events: none;
  }
  /* крупный «водяной знак» иконки */
  .wm {
    position: absolute;
    right: -10px;
    bottom: -14px;
    z-index: -1;
    opacity: 0.13;
    display: flex;
    pointer-events: none;
  }
  button.tile:active {
    transform: scale(0.98);
    filter: brightness(1.08);
  }
  .t-ac {
    background: linear-gradient(155deg, #d8693c, #b9532c 55%, #9c4222);
  }
  .t-init {
    background: linear-gradient(155deg, #c0952f, #9c7420 55%, #80601a);
  }
  .t-speed {
    background: linear-gradient(155deg, #a04460, #7a2e45 55%, #5f2235);
  }
  .t-prof {
    background: linear-gradient(155deg, #3f7983, #2d5961 55%, #22464d);
  }
  .ic {
    position: absolute;
    left: 12px;
    top: 10px;
    opacity: 0.9;
    display: flex;
  }
  .k {
    font-size: 10.5px;
    letter-spacing: 0.1em;
    font-weight: 700;
    opacity: 0.88;
    text-align: right;
    text-transform: uppercase;
    padding-left: 28px;
    line-height: 1.25;
  }
  .v {
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 40px;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .v.long {
    font-size: 24px;
  }
  .s {
    font-size: 11.5px;
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .inline {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 4px;
  }
  .tile :global(.field) {
    background: color-mix(in srgb, var(--bg) 25%, transparent);
    border-color: color-mix(in srgb, var(--parch3) 45%, transparent);
    color: var(--parch3);
  }
  .tile :global(.field:focus) {
    border-color: var(--parch3);
  }
  .tile :global(.field::placeholder) {
    color: color-mix(in srgb, var(--parch3) 55%, transparent);
  }
  .tile :global(.nf input) {
    font-size: 26px;
    font-family: var(--font-serif);
    font-weight: 700;
    min-height: 48px;
    padding: 4px 8px;
  }
  .note {
    font-size: 13px;
    padding: 6px 10px;
  }
  .speed {
    font-size: 22px;
    font-family: var(--font-serif);
    font-weight: 700;
    text-align: center;
  }
</style>
