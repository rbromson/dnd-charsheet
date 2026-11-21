<script lang="ts">
  /** Карточка с текстом: в игре — читаемый текст (долгий тап — правка в карточке), в правке — поле. */
  import TextField from '../../components/TextField.svelte';
  import TextSheet from './TextSheet.svelte';
  import type { TextTarget } from './fields';
  import { ui } from '../../lib/stores/ui.svelte';
  import { press } from '../../lib/actions/press';
  import { t } from '../../lib/i18n';

  let { target, value = $bindable(), rows = 4 }: { target: TextTarget; value: string; rows?: number } = $props();
</script>

<section class="card">
  <h2 class="card-title">{t(`profile.${target.key}`)}</h2>
  {#if ui.editing}
    <TextField bind:value multiline {rows} serif />
  {:else}
    <div class="body" use:press={{ onLong: () => ui.openSheet(TextSheet, { target }) }}>
      {#if value.trim()}
        <div class="txt serif">{value}</div>
      {:else}
        <div class="hint">{t('profile.empty')}</div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .body {
    min-height: var(--tap);
    user-select: none;
    -webkit-user-select: none;
  }
  .txt {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 16.5px;
    line-height: 1.55;
    color: var(--ink);
  }
  .hint {
    font-size: 13.5px;
    color: var(--ink2);
    font-style: italic;
    padding: 6px 0;
  }
</style>
