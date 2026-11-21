<script lang="ts">
  /** Кнопки для строк списка в режиме правки: вверх / вниз / удалить. */
  import Icon from './Icon.svelte';
  import { t } from '../lib/i18n';
  let { onUp, onDown, onDelete }: { onUp?: () => void; onDown?: () => void; onDelete?: () => void } = $props();
</script>

<div class="ra">
  {#if onUp}<button class="btn btn-ghost" aria-label={t('common.moveUp')} onclick={onUp}><Icon name="up" size={20} /></button>{/if}
  {#if onDown}<button class="btn btn-ghost" aria-label={t('common.moveDown')} onclick={onDown}><Icon name="down" size={20} /></button>{/if}
  {#if onDelete}<button class="btn btn-ghost del" aria-label={t('common.delete')} onclick={onDelete}><Icon name="trash" size={20} /></button>{/if}
</div>

<style>
  .ra {
    display: flex;
    gap: 0;
  }
  .ra .btn {
    padding: 0;
  }
  .del {
    color: var(--bad);
  }
</style>
