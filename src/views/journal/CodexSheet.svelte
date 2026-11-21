<script lang="ts">
  /** Карточка справочника в боковой панели (узкий экран): ui.openSheet(CodexSheet, { id, onpick }). */
  import { untrack } from 'svelte';
  import SheetFrame from '../../components/SheetFrame.svelte';
  import CodexCard from './CodexCard.svelte';
  import CodexSheet from './CodexSheet.svelte';
  import { codex } from '../../lib/stores/codex.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';
  import type { Sel } from './state.svelte';

  let { id, onpick }: { id: string; onpick: (s: Sel) => void } = $props();

  // Пока панель закрывается (анимация), ui.sheet уже null и чтение props бросает — держим последнее значение.
  let lastId = untrack(() => id);
  const sid = $derived.by(() => {
    try {
      lastId = id;
    } catch {
      /* панель закрывается */
    }
    return lastId;
  });
  const pickFn = untrack(() => onpick);

  const c = $derived(codex.get(sid));
  // Карточку удалили — закрываем панель
  $effect(() => {
    if (!c) ui.closeSheet();
  });

  function openOther(other: string) {
    if (other !== sid) ui.openSheet(CodexSheet, { id: other, onpick: pickFn });
  }
  function ref(r: Sel) {
    ui.closeSheet();
    pickFn(r);
  }
</script>

{#if c}
  <SheetFrame kicker={t(`journal.codex.kind.${c.kind}`)} title={c.name || '—'}>
    {#key sid}
      <CodexCard id={sid} header={false} onopen={openOther} onref={ref} />
    {/key}
  </SheetFrame>
{:else}
  <SheetFrame title="—">
    <div class="empty">{t('common.empty')}</div>
  </SheetFrame>
{/if}
