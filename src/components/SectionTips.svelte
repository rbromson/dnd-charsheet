<script lang="ts">
  /** Коротка підказка до поточного розділу (кнопка «?» біля «Гра / Правка»). Повне навчання — посиланням унизу. */
  import SheetFrame from './SheetFrame.svelte';
  import Icon from './Icon.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { has, t } from '../lib/i18n';

  const tab = ui.tab;
  const tips = [1, 2, 3, 4, 5].map((i) => `tips.${tab}.${i}`).filter((k) => has(k));

  function tutorial() {
    ui.closeSheet();
    ui.tutorialOpen = true;
  }
</script>

<SheetFrame kicker={t('tips.kicker')} title={t(`nav.${tab}`)}>
  <ul class="tips">
    {#each tips as k (k)}
      <li><span class="dot" aria-hidden="true"></span><span>{t(k)}</span></li>
    {/each}
  </ul>
  <button class="btn btn-ghost more" onclick={tutorial}><Icon name="eye" size={18} />{t('tut.open')}</button>
</SheetFrame>

<style>
  .tips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  li {
    display: flex;
    gap: 10px;
    font-size: 15px;
    line-height: 1.5;
  }
  .dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    margin-top: 8px;
    transform: rotate(45deg);
    background: linear-gradient(135deg, #e9c27a, #9a6a2a);
  }
  .more {
    align-self: flex-start;
    padding: 0 6px;
  }
</style>
