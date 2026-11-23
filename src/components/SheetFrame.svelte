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
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 20px 16px 14px 22px;
  }
  /* орнаментальная линия под заголовком */
  header::after {
    content: '';
    position: absolute;
    left: 22px;
    right: 22px;
    bottom: 3px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(107, 90, 72, 0.45) 15%, rgba(107, 90, 72, 0.45) calc(50% - 12px), transparent calc(50% - 12px), transparent calc(50% + 12px), rgba(107, 90, 72, 0.45) calc(50% + 12px), rgba(107, 90, 72, 0.45) 85%, transparent);
  }
  header::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 0;
    width: 7px;
    height: 7px;
    margin-left: -3.5px;
    transform: rotate(45deg);
    background: var(--ember);
  }
  .kicker {
    font-size: 10.5px;
    letter-spacing: 0.18em;
    font-weight: 700;
    color: var(--ember);
    text-transform: uppercase;
    filter: saturate(0.85) brightness(0.85);
  }
  h2 {
    font-size: 30px;
    line-height: 1.1;
    /* одна строка: пока вводят длинное название, шторка не прыгает вниз */
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  header .grow {
    min-width: 0;
  }
  .value {
    font-size: 40px;
    line-height: 1;
    padding: 6px 12px 4px;
    border-radius: 14px;
    background: rgba(42, 31, 23, 0.06);
    box-shadow: inset 0 0 0 1px rgba(150, 112, 62, 0.35);
  }
  .close {
    margin-top: -4px;
  }
  .body {
    flex: 1;
    overflow: auto;
    padding: 14px 22px 22px;
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
