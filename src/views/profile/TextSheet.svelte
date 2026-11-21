<script lang="ts">
  /** Правка одного текстового поля «Персонажа» (открывается долгим тапом в режиме игры). */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import TextField from '../../components/TextField.svelte';
  import Icon from '../../components/Icon.svelte';
  import type { TextTarget } from './fields';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  let { target }: { target: TextTarget } = $props();

  const c = $derived(charStore.current);
</script>

{#if c}
  <SheetFrame kicker={c.name.trim() || t('profile.kicker')} title={t(`profile.${target.key}`)}>
    {#if target.group === 'profile'}
      <TextField bind:value={c.profile[target.key]} multiline rows={12} serif />
    {:else}
      <TextField bind:value={c.traits[target.key]} multiline rows={8} serif />
    {/if}

    {#snippet footer()}
      <div class="grow"></div>
      <button class="btn btn-ink" onclick={() => ui.closeSheet()}><Icon name="check" size={20} />{t('common.done')}</button>
    {/snippet}
  </SheetFrame>
{/if}
