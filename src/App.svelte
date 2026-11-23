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
  import { loadItems, loadSpells } from './lib/library';
  import { migrateMechanics, MECH_VERSION } from './lib/library/migrate';
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

  // старые предметы из библиотеки получают действия и заряды (один раз на персонажа)
  $effect(() => {
    const c = charStore.current;
    if (!c || c.rules.mech >= MECH_VERSION) return;
    const id = c.id;
    Promise.all([loadItems(), loadSpells().catch(() => [])])
      .then(([lib, spells]) => {
        const cur = charStore.current;
        if (cur && cur.id === id) migrateMechanics(cur, lib, spells);
      })
      .catch(() => {});
  });

  $effect(() => {
    void ui.tab;
    main?.scrollTo({ top: 0 });
    ui.fabHidden = false;
  });

  // листают вниз — кнопки кубиків/привалу ховаються; вгору чи в самому низу — повертаються
  let lastTop = 0;
  function onScroll() {
    if (!main) return;
    const top = main.scrollTop;
    const d = top - lastTop;
    const atEnd = top + main.clientHeight >= main.scrollHeight - 24;
    if (top < 40 || d < -6) ui.fabHidden = false;
    else if (d > 6 && !atEnd) ui.fabHidden = true;
    if (Math.abs(d) > 6) lastTop = top;
  }
  const fabs = $derived(ui.tab === 'sheet' || ui.tab === 'combat' || ui.tab === 'spells');
</script>

<!-- пока данные грузятся — только фон (без пустой рамки с боковой панелью) -->
{#if !charStore.ready}
  <div class="boot" aria-hidden="true"></div>
{:else if !charStore.current}
  <EmptyState />
{:else}
<div class="shell">
  <NavRail />
  <main bind:this={main} class:fabpad={fabs} onscroll={onScroll}>
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
{#if charStore.current && fabs}<RestFab /><DiceFab />{/if}
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
  .boot {
    height: 100dvh;
  }
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
    padding-bottom: 40px;
  }
  main.fabpad {
    padding-bottom: 170px;
  }
  /* планшет/десктоп: кнопки кубиків і привалу — у своїй смузі справа, не поверх кнопок «Шкода» */
  @media (min-width: 900px) {
    main.fabpad :global(.view) {
      padding-right: calc(92px + env(safe-area-inset-right));
    }
  }
  @media (max-width: 640px) {
    .shell {
      display: block;
    }
    main {
      height: 100dvh;
      padding-bottom: calc(64px + 32px + env(safe-area-inset-bottom));
    }
    main.fabpad {
      padding-bottom: calc(64px + 160px + env(safe-area-inset-bottom));
    }
  }
</style>
