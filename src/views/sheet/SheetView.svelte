<script lang="ts">
  import TopBar from '../../components/TopBar.svelte';
  import TextField from '../../components/TextField.svelte';
  import SheetHeader from './SheetHeader.svelte';
  import StatTiles from './StatTiles.svelte';
  import AbilityShields from './AbilityShields.svelte';
  import SavesCard from './SavesCard.svelte';
  import SkillsCard from './SkillsCard.svelte';
  import FeaturesCard from './FeaturesCard.svelte';
  import ItemEffectsCard from './ItemEffectsCard.svelte';
  import ConditionsCard from '../combat/ConditionsCard.svelte';
  import TileSheet from './TileSheet.svelte';
  import PassiveSheet from './PassiveSheet.svelte';
  import { press } from '../../lib/actions/press';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { fmt, passivePerception, profBonus } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  const openProf = () => ui.openSheet(TileSheet, { kind: 'prof' });
  const openPassive = () => ui.openSheet(PassiveSheet, {});
</script>

<TopBar title={t('nav.sheet')} />
<div class="view">
  <SheetHeader />
  <StatTiles />

  <div class="cols cols-3 sheet-cols">
    <div class="stack">
      <section class="card">
        <AbilityShields />
      </section>
      <section class="card boxes">
        <button class="box" use:press={{ onTap: () => ui.editing && openProf(), onLong: openProf }}>
          <span class="bv num">{fmt(profBonus(c))}</span>
          <span class="bl">{t('sheet.tile.prof')}</span>
        </button>
        <button class="box" use:press={{ onTap: () => ui.editing && openPassive(), onLong: openPassive }}>
          <span class="bv num">{passivePerception(c)}</span>
          <span class="bl">{t('sheet.passive')}</span>
        </button>
      </section>
    </div>

    <div class="stack">
      <SavesCard />
      <SkillsCard />
    </div>

    <div class="stack">
      <section class="card">
        <h3 class="card-title">{t('sheet.proficiencies')}</h3>
        {#if ui.editing}
          <TextField bind:value={c.proficiencies} multiline rows={3} placeholder={t('sheet.proficienciesPh')} />
        {:else if c.proficiencies.trim()}
          <p class="prose">{c.proficiencies}</p>
        {:else}
          <div class="empty">{t('sheet.emptyText')}</div>
        {/if}
      </section>
      <ConditionsCard onlyActive />
      <ItemEffectsCard />
      <FeaturesCard />
    </div>
  </div>
</div>

<style>
  @container (min-width: 1040px) {
    .sheet-cols {
      grid-template-columns: 0.9fr 1.5fr 1fr;
    }
  }
  .boxes {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px;
  }
  .box {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 56px;
    text-align: left;
    color: var(--ink);
    user-select: none;
  }
  .box + .box {
    border-top: 1px dashed color-mix(in srgb, var(--ink2) 25%, transparent);
  }
  .bv {
    min-width: 52px;
    height: 44px;
    padding: 0 8px;
    border-radius: 22px;
    border: 1.6px solid var(--ink2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
  }
  .bl {
    font-family: var(--font-sc);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.05em;
    color: var(--ink2);
    line-height: 1.25;
  }
  .prose {
    margin: 0;
    font-size: 14.5px;
    line-height: 1.55;
    white-space: pre-line;
  }
</style>
