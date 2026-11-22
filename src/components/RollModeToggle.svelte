<script lang="ts">
  /** Перевага / звичайний / перешкода для следующего броска d20. */
  import Segmented from './Segmented.svelte';
  import { dice } from '../lib/stores/dice.svelte';
  import { t } from '../lib/i18n';
</script>

<div class="rm">
  <Segmented
    bind:value={dice.mode}
    options={[
      { value: 'dis', label: t('roll.dis') },
      { value: 'normal', label: t('roll.normal') },
      { value: 'adv', label: t('roll.adv') },
    ]}
  />
</div>

<style>
  .rm {
    width: 100%;
    max-width: 400px;
  }
</style>
