<script lang="ts">
  /**
   * Оформление боковой карточки (открывается через ui.openSheet(Component, props)).
   * Внутри своего компонента оберните содержимое: <SheetFrame kicker="НАВИЧКА" title="Обман" value="+9">…</SheetFrame>
   */
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n';

  let {
    title,
    kicker = '',
    value = '',
    children,
    footer,
  }: { title: string; kicker?: string; value?: string; children: Snippet; footer?: Snippet } = $props();
</script>

<div class="frame">
  <header>
    <div class="grow">
      {#if kicker}<div class="kicker">{kicker}</div>{/if}
      <h2 class="serif">{title}</h2>
    </div>
    {#if value}<div class="value num">{value}</div>{/if}
    <button class="btn btn-ghost close" aria-label={t('common.close')} onclick={() => ui.closeSheet()}><Icon name="close" /></button>
  </header>
  <div class="body">{@render children()}</div>
  {#if footer}<footer>{@render footer()}</footer>{/if}
</div>

<style>
  .frame {
    display: flex;
    flex-direction: column;
    height: 100%;
    color: var(--ink);
  }
  header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 18px 16px 8px 22px;
  }
  .kicker {
    font-size: 10.5px;
    letter-spacing: 0.16em;
    font-weight: 700;
    color: var(--ink2);
    text-transform: uppercase;
  }
  h2 {
    font-size: 28px;
    line-height: 1.1;
  }
  .value {
    font-size: 38px;
    line-height: 1;
    padding-top: 6px;
  }
  .close {
    margin-top: -4px;
  }
  .body {
    flex: 1;
    overflow: auto;
    padding: 8px 22px 22px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  footer {
    padding: 12px 22px 18px;
    border-top: 1px solid rgba(107, 90, 72, 0.25);
    display: flex;
    gap: 8px;
  }
</style>
