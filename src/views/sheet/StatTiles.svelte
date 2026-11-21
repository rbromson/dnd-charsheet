<script lang="ts">
  /** Четыре цветные плитки: КО, ініціатива, швидкість, бонус майстерності. Общие для «Аркуш» и «Бій». */
  import Icon from '../../components/Icon.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import TileSheet from './TileSheet.svelte';
  import { press } from '../../lib/actions/press';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { armorClass, fmt, initiative, profBonus } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  const open = (kind: 'ac' | 'init' | 'speed' | 'prof') => ui.openSheet(TileSheet, { kind });

  function rollInit() {
    dice.askCheck({ kind: 'init', label: t('sheet.tile.init'), bonus: initiative(c) });
  }
</script>

<div class="tiles">
  <!-- КО -->
  {#if ui.editing && !c.acAuto}
    <div class="tile t-ac">
      <span class="ic"><Icon name="shield" size={18} stroke={2.2} /></span><span class="wm" aria-hidden="true"><Icon name="shield" size={86} stroke={1.4} /></span>
      <div class="k">{t('sheet.tile.ac')}</div>
      <div class="inline">
        <NumberField bind:value={c.ac} min={0} max={50} />
        <input class="field note" type="text" placeholder={t('sheet.acNotePh')} bind:value={c.acNote} enterkeyhint="done" />
      </div>
    </div>
  {:else}
    <button class="tile t-ac" use:press={{ onTap: () => ui.editing && open('ac'), onLong: () => open('ac') }}>
      <span class="ic"><Icon name="shield" size={18} stroke={2.2} /></span><span class="wm" aria-hidden="true"><Icon name="shield" size={86} stroke={1.4} /></span>
      <div class="k">{t('sheet.tile.ac')}</div>
      <div class="v">{armorClass(c)}</div>
      <div class="s">{c.acAuto ? t('sheet.tile.acAuto') : c.acNote || ' '}</div>
    </button>
  {/if}

  <!-- Ініціатива -->
  <button
    class="tile t-init"
    use:press={{ onTap: () => (ui.editing ? open('init') : rollInit()), onLong: () => open('init') }}
  >
    <span class="ic"><Icon name="bolt" size={18} stroke={2.2} /></span><span class="wm" aria-hidden="true"><Icon name="bolt" size={86} stroke={1.4} /></span>
    <div class="k">{t('sheet.tile.init')}</div>
    <div class="v">{fmt(initiative(c))}</div>
    <div class="s">{ui.editing ? t('sheet.tile.tapEdit') : t('sheet.tile.tapRoll')}</div>
  </button>

  <!-- Швидкість -->
  {#if ui.editing}
    <div class="tile t-speed">
      <span class="ic"><Icon name="boot" size={18} stroke={2.2} /></span><span class="wm" aria-hidden="true"><Icon name="boot" size={86} stroke={1.4} /></span>
      <div class="k">{t('sheet.tile.speed')}</div>
      <div class="inline">
        <input class="field speed" type="text" inputmode="text" placeholder={t('sheet.speedPh')} bind:value={c.speed} enterkeyhint="done" />
      </div>
      <div class="s">{t('sheet.tile.feet')}</div>
    </div>
  {:else}
    <button class="tile t-speed" use:press={{ onLong: () => open('speed') }}>
      <span class="ic"><Icon name="boot" size={18} stroke={2.2} /></span><span class="wm" aria-hidden="true"><Icon name="boot" size={86} stroke={1.4} /></span>
      <div class="k">{t('sheet.tile.speed')}</div>
      <div class="v" class:long={c.speed.length > 4}>{c.speed || '—'}</div>
      <div class="s">{t('sheet.tile.feet')}</div>
    </button>
  {/if}

  <!-- Бонус майстерності -->
  <button class="tile t-prof" use:press={{ onTap: () => ui.editing && open('prof'), onLong: () => open('prof') }}>
    <span class="ic"><Icon name="clock" size={18} stroke={2.2} /></span><span class="wm" aria-hidden="true"><Icon name="clock" size={86} stroke={1.4} /></span>
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
  /* Кожаная пластина со строчкой; цвет — только акцент (медальон, подпись, свечение). */
  .tile {
    position: relative;
    border-radius: var(--r);
    padding: 11px 14px 11px;
    min-height: 108px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 2px;
    color: var(--parch);
    text-align: left;
    overflow: hidden;
    user-select: none;
    isolation: isolate;
    background: var(--leather);
    background-size: var(--leather-size);
    box-shadow:
      var(--leather-shadow),
      inset 0 -3px 0 -1px var(--acc),
      0 10px 22px -10px rgba(0, 0, 0, 0.85);
    transition:
      transform 0.12s var(--ease),
      filter 0.15s;
  }
  /* строчка */
  .tile::after {
    content: '';
    position: absolute;
    inset: 5px 5px 7px;
    border-radius: calc(var(--r) - 5px);
    border: 1.5px dashed var(--stitch);
    pointer-events: none;
  }
  /* отсвет акцентного цвета из-за медальона */
  .tile::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: radial-gradient(ellipse 70% 90% at 0% 0%, color-mix(in srgb, var(--acc) 30%, transparent), transparent 65%);
    pointer-events: none;
  }
  button.tile:active {
    transform: scale(0.98);
    filter: brightness(1.12);
  }
  .t-ac {
    --acc: #e0703f;
  }
  .t-init {
    --acc: #d9a63c;
  }
  .t-speed {
    --acc: #c45876;
  }
  .t-prof {
    --acc: #5aa0ab;
  }
  /* крупный «водяной знак» иконки в цвете акцента */
  .wm {
    position: absolute;
    right: -10px;
    bottom: -14px;
    z-index: -1;
    color: var(--acc);
    opacity: 0.12;
    display: flex;
    pointer-events: none;
  }
  /* медальон-печать */
  .ic {
    position: absolute;
    left: 12px;
    top: 11px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1a0f08;
    background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--acc) 55%, white), var(--acc) 55%, color-mix(in srgb, var(--acc) 70%, black));
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.35),
      inset 0 -2px 3px rgba(0, 0, 0, 0.3),
      0 0 0 2px rgba(0, 0, 0, 0.35),
      0 0 14px color-mix(in srgb, var(--acc) 45%, transparent);
  }
  .k {
    font-size: 10.5px;
    letter-spacing: 0.12em;
    font-weight: 700;
    color: color-mix(in srgb, var(--acc) 70%, var(--parch));
    text-align: right;
    text-transform: uppercase;
    padding-left: 40px;
    line-height: 1.2;
    min-height: 34px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
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
    color: var(--parch);
    text-shadow: 0 2px 0 rgba(0, 0, 0, 0.5), 0 0 18px color-mix(in srgb, var(--acc) 30%, transparent);
  }
  .v.long {
    font-size: 24px;
  }
  .s {
    font-size: 11.5px;
    color: var(--muted);
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
    background: rgba(0, 0, 0, 0.3);
    border-color: color-mix(in srgb, var(--acc) 45%, transparent);
    color: var(--parch3);
  }
  .tile :global(.field:focus) {
    border-color: var(--acc);
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
