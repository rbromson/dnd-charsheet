<script lang="ts">
  /** Пасивна мудрість (уважність): доп. бонус и ручное значение. */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import TweakEditor from '../../components/TweakEditor.svelte';
  import CalcLine from './CalcLine.svelte';
  import { passiveParts } from './explain';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { passivePerception, passivePerceptionAuto } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
</script>

{#if c}
  <SheetFrame kicker={t('sheet.passiveKicker')} title={t('sheet.passive')} value={String(passivePerception(c))}>
    <TweakEditor bind:tweak={c.passivePerception} auto={passivePerceptionAuto(c)} signed={false} />
    <CalcLine parts={passiveParts(c)} total={passivePerceptionAuto(c)} override={c.passivePerception.override} signed={false} />
    {#snippet footer()}
      <button class="btn btn-outline grow" onclick={() => ui.closeSheet()}>{t('common.done')}</button>
    {/snippet}
  </SheetFrame>
{/if}
