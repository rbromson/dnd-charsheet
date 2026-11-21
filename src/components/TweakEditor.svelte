<script lang="ts">
  /**
   * Блок «Доп. бонус / Вручну» для любого автоматически вычисляемого числа.
   * <TweakEditor bind:tweak={c.skills.stealth} auto={skillAuto(c,'stealth')} />
   */
  import type { Tweak } from '../lib/model/types';
  import NumberField from './NumberField.svelte';
  import Stepper from './Stepper.svelte';
  import { t } from '../lib/i18n';
  import { fmt } from '../lib/rules/calc';

  let { tweak = $bindable(), auto, signed = true }: { tweak: Tweak; auto: number; signed?: boolean } = $props();
</script>

<div class="tw">
  <div>
    <span class="label">{t('common.extraBonus')}</span>
    <Stepper bind:value={tweak.bonus} min={-20} max={20} />
  </div>
  <div class="man">
    <NumberField label={t('common.manual')} bind:value={tweak.override} nullable placeholder={`${t('common.auto')} ${signed ? fmt(auto) : auto}`} />
  </div>
</div>

<style>
  .tw {
    display: flex;
    gap: 16px;
    align-items: flex-end;
    flex-wrap: wrap;
  }
  .man {
    flex: 1;
    min-width: 140px;
  }
</style>
