<script lang="ts">
  /** Настройки плиток: КО, ініціатива, швидкість, бонус майстерності. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import NumberField from '../../components/NumberField.svelte';
  import TextField from '../../components/TextField.svelte';
  import TweakEditor from '../../components/TweakEditor.svelte';
  import Icon from '../../components/Icon.svelte';
  import CalcLine from './CalcLine.svelte';
  import { initParts } from './explain';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { acFromGear, itemAcBonusParts, armorClass, fmt, initiative, initiativeAuto, profBonus, profBonusForLevel } from '../../lib/rules/calc';
  import Toggle from '../../components/Toggle.svelte';
  import { t } from '../../lib/i18n';

  let { kind }: { kind: 'ac' | 'init' | 'speed' | 'prof' } = $props();

  const c = $derived(charStore.current!);

  const title = $derived(
    kind === 'ac' ? t('sheet.tile.ac') : kind === 'init' ? t('sheet.tile.init') : kind === 'speed' ? t('sheet.tile.speed') : t('sheet.tile.prof'),
  );
  const value = $derived(
    !c ? '' : kind === 'ac' ? String(armorClass(c)) : kind === 'init' ? fmt(initiative(c)) : kind === 'speed' ? c.speed : fmt(profBonus(c)),
  );

  function rollInit() {
    dice.askCheck({ kind: 'init', label: t('sheet.tile.init'), bonus: initiative(c) });
    ui.closeSheet();
  }
</script>

{#if c}
  <SheetFrame {title} {value}>
    {#if kind === 'ac'}
      <Toggle label={t('sheet.acAutoToggle')} bind:checked={c.acAuto} />
      {#if c.acAuto}
        {@const g = acFromGear(c)}
        <div class="calcbox">
          {#each g.parts as p, i (i)}<span class="pt">{i ? (p.value < 0 ? ' − ' : ' + ') : ''}{i ? Math.abs(p.value) : p.value} <span class="muted">{p.label}</span></span>{/each}
          = <b>{g.total}</b>
        </div>
        <p class="muted hint">{t('sheet.acAutoHint')}</p>
      {:else}
        <NumberField label={t('sheet.tile.ac')} bind:value={c.ac} min={0} max={50} big />
        <TextField label={t('sheet.acNote')} placeholder={t('sheet.acNotePh')} bind:value={c.acNote} />
        {#if itemAcBonusParts(c).length}
          <div class="calcbox">
            {t('sheet.acManualPlus')}
            {#each itemAcBonusParts(c) as p, i (i)}<span class="pt"> +{p.value} <span class="muted">{p.label}</span></span>{/each}
            = <b>{armorClass(c)}</b>
          </div>
        {/if}
        <p class="muted hint">{t('sheet.acManualHint', { v: acFromGear(c).total })}</p>
      {/if}
    {:else if kind === 'speed'}
      <TextField label={t('sheet.speedValue')} placeholder={t('sheet.speedPh')} bind:value={c.speed} />
      <p class="muted hint">{t('sheet.speedHint')}</p>
    {:else if kind === 'init'}
      <TweakEditor bind:tweak={c.initiative} auto={initiativeAuto(c)} />
      <CalcLine parts={initParts(c)} total={initiativeAuto(c)} override={c.initiative.override} />
    {:else}
      <NumberField
        label={t('sheet.f.prof')}
        bind:value={c.profBonusOverride}
        nullable
        min={0}
        max={20}
        big
        placeholder={t('sheet.profAutoPh', { v: fmt(profBonusForLevel(c.level)) })}
      />
      <div class="calcbox">{t('sheet.profAutoLine', { lvl: c.level, v: fmt(profBonusForLevel(c.level)) })}</div>
      <p class="muted hint">{t('sheet.profHint')}</p>
    {/if}

    {#snippet footer()}
      {#if kind === 'init'}
        <button class="btn btn-ink grow" onclick={rollInit}><Icon name="dice" size={20} />{t('sheet.initRoll')}</button>
      {:else}
        <button class="btn btn-outline grow" onclick={() => ui.closeSheet()}>{t('common.done')}</button>
      {/if}
    {/snippet}
  </SheetFrame>
{/if}

<style>
  .hint {
    margin: 0;
    font-size: 13px;
  }
  .pt {
    white-space: nowrap;
  }
  .calcbox {
    padding: 10px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--ink) 7%, transparent);
    font-size: 13.5px;
  }
</style>
