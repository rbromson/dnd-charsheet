<script lang="ts">
  import NavRail from './components/NavRail.svelte';
  import DiceFab from './components/DiceFab.svelte';
  import RestFab from './components/RestFab.svelte';
  import RestTray from './views/rest/RestTray.svelte';
  import CharacterSwitcher from './components/CharacterSwitcher.svelte';
  import SheetHost from './components/SheetHost.svelte';
  import Confirm from './components/Confirm.svelte';
  import Toasts from './components/Toasts.svelte';
  import QuickNote from './components/QuickNote.svelte';
  import DiceOverlay from './views/dice/DiceOverlay.svelte';
  import DiceTray from './views/dice/DiceTray.svelte';
  import RollPrompt from './views/dice/RollPrompt.svelte';
  import EmptyState from './components/EmptyState.svelte';
  import Tutorial, { tutorialSeen } from './components/Tutorial.svelte';
  import SheetView from './views/sheet/SheetView.svelte';
  import CombatView from './views/combat/CombatView.svelte';
  import SpellsView from './views/spells/SpellsView.svelte';
  import GearView from './views/gear/GearView.svelte';
  import ProfileView from './views/profile/ProfileView.svelte';
  import JournalView from './views/journal/JournalView.svelte';
  import { ui } from './lib/stores/ui.svelte';
  import { charStore } from './lib/stores/characters.svelte';
  import { journal } from './lib/stores/journal.svelte';
  import { codex } from './lib/stores/codex.svelte';
  import { requestPersistence } from './lib/db';
  import { onMount } from 'svelte';

  void journal;
  void codex;

  let main: HTMLElement | undefined = $state();

  onMount(() => {
    charStore.load();
    requestPersistence();
    if (!tutorialSeen()) ui.tutorialOpen = true;
    const flush = () => {
      charStore.flush();
      journal.flush();
      codex.flush();
    };
    const onVis = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', flush);
    };
  });

  $effect(() => {
    void ui.tab;
    main?.scrollTo({ top: 0 });
  });
</script>

{#if charStore.ready && !charStore.current}
  <EmptyState />
{:else}
<div class="shell">
  <NavRail />
  <main bind:this={main}>
    {#if charStore.ready && charStore.current}
      {#key charStore.current.id}
        {#if ui.tab === 'sheet'}<SheetView />
        {:else if ui.tab === 'combat'}<CombatView />
        {:else if ui.tab === 'spells'}<SpellsView />
        {:else if ui.tab === 'gear'}<GearView />
        {:else if ui.tab === 'profile'}<ProfileView />
        {:else if ui.tab === 'journal'}<JournalView />
        {/if}
      {/key}
    {/if}
  </main>
</div>
{#if charStore.current && (ui.tab === 'sheet' || ui.tab === 'combat' || ui.tab === 'spells')}<RestFab /><DiceFab />{/if}
{/if}

<CharacterSwitcher />
<DiceTray />
<RestTray />
<QuickNote />
<SheetHost />
<RollPrompt />
<DiceOverlay />
<Confirm />
<Tutorial />
<Toasts />

<style>
  .shell {
    display: flex;
    height: 100dvh;
  }
  main {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: env(safe-area-inset-right);
    padding-bottom: 170px;
  }
  @media (max-width: 640px) {
    .shell {
      display: block;
    }
    main {
      height: 100dvh;
      padding-bottom: calc(64px + 160px + env(safe-area-inset-bottom));
    }
  }
</style>
