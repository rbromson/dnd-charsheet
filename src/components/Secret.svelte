<script lang="ts">
  /**
   * Секрет под восковой печатью: размыт, пока его удерживают пальцем.
   * В режиме правки (или editable) — обычное текстовое поле.
   * <Secret bind:value={c.secret} editable={ui.editing} />
   */
  import TextField from './TextField.svelte';
  import { t } from '../lib/i18n';
  import { charStore } from '../lib/stores/characters.svelte';

  let {
    value = $bindable(),
    editable = false,
    compact = false,
    label = '',
  }: { value: string; editable?: boolean; compact?: boolean; label?: string } = $props();

  let open = $state(false);
  const seal = $derived((charStore.current?.name.trim()[0] ?? '✶').toUpperCase());

  function show(e: PointerEvent) {
    e.preventDefault();
    open = true;
    try {
      navigator.vibrate?.(10);
    } catch {
      /* */
    }
  }
  function hide() {
    open = false;
  }
</script>

{#if editable}
  <div class="ed">
    <TextField bind:value label={label || t('secret.label')} multiline rows={compact ? 2 : 3} placeholder={t('secret.placeholder')} />
  </div>
{:else if value.trim()}
  <div
    class="secret"
    class:open
    class:compact
    role="button"
    tabindex="0"
    aria-label={t('secret.hold')}
    onpointerdown={show}
    onpointerup={hide}
    onpointerleave={hide}
    onpointercancel={hide}
    oncontextmenu={(e) => e.preventDefault()}
  >
    <div class="txt">{value}</div>
    {#if !open}
      <div class="veil">
        <div class="seal sc">{seal}</div>
        {#if !compact}<div class="h">{t('secret.title')}<small>{t('secret.hold')}</small></div>{/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .secret {
    position: relative;
    border-radius: 14px;
    overflow: hidden;
    background: #d7c39d;
    box-shadow: inset 0 0 0 1.5px #a88c5c;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    min-height: var(--tap);
    cursor: pointer;
  }
  .txt {
    padding: 14px 16px;
    font-family: var(--font-hand);
    font-size: 22px;
    line-height: 1.35;
    color: #3a2416;
    filter: blur(8px);
    transition: filter 0.2s;
    white-space: pre-wrap;
  }
  .compact .txt {
    font-size: 17px;
    padding: 10px 12px;
  }
  .open .txt {
    filter: none;
  }
  .veil {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
  }
  .seal {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: radial-gradient(circle at 38% 32%, #d0564a, #8e1f1c 70%);
    box-shadow:
      0 3px 8px rgba(0, 0, 0, 0.35),
      inset 0 0 0 4px rgba(0, 0, 0, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f3c9b9;
    font-size: 24px;
    font-weight: 700;
  }
  .compact .seal {
    width: 42px;
    height: 42px;
    font-size: 17px;
  }
  .h {
    font-size: 13px;
    font-weight: 700;
    color: #3a2416;
    letter-spacing: 0.04em;
  }
  .h small {
    display: block;
    font-weight: 500;
    color: #5b4430;
  }
</style>
