<script lang="ts">
  import NavRail from './components/NavRail.svelte';
  import CharacterSwitcher from './components/CharacterSwitcher.svelte';
  import SheetHost from './components/SheetHost.svelte';
  import Confirm from './components/Confirm.svelte';
  import Toasts from './components/Toasts.svelte';
  import QuickNote from './components/QuickNote.svelte';
  import DiceOverlay from './views/dice/DiceOverlay.svelte';
  import DiceTray from './views/dice/DiceTray.svelte';
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

<CharacterSwitcher />
<DiceTray />
<QuickNote />
<SheetHost />
<DiceOverlay />
<Confirm />
<Toasts />

<style>
  .shell {
    display: flex;
    height: 100dvh;
    background-image:
      radial-gradient(ellipse at 75% -15%, rgba(232, 116, 59, 0.11), transparent 55%),
      radial-gradient(ellipse at 0% 115%, rgba(120, 70, 30, 0.2), transparent 50%);
  }
  main {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: env(safe-area-inset-right);
  }
</style>
