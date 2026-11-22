<script lang="ts">
  import TopBar from '../../components/TopBar.svelte';
  import StatTiles from '../sheet/StatTiles.svelte';
  import HpCard from './HpCard.svelte';
  import DeathSaves from './DeathSaves.svelte';
  import HitDiceCard from './HitDiceCard.svelte';
  import ResourcesCard from './ResourcesCard.svelte';
  import AttacksCard from './AttacksCard.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { t } from '../../lib/i18n';

  const down = $derived(!!charStore.current && charStore.current.hp.current === 0 && charStore.current.hp.max > 0);
</script>

<TopBar title={t('nav.combat')} />
<div class="view">
  <StatTiles />

  <div class="cols cols-2 combat-cols">
    <div class="stack">
      <!-- рятунки від смерті — лише коли персонаж при смерті (0 ОЗ) -->
      {#if down}<DeathSaves />{/if}
      <HpCard />
      <HitDiceCard />
    </div>
    <div class="stack">
      <ResourcesCard />
      <AttacksCard />
    </div>
  </div>
</div>

<style>
  @container (min-width: 1040px) {
    .combat-cols {
      grid-template-columns: 1fr 1.3fr;
    }
  }
</style>
