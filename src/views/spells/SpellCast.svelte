<script lang="ts">
  /**
   * «Скастувати» в розгорнутому заклинанні: вибір кола комірки (від свого й вище), списання,
   * концентрація (обриває попередню) і ефект на себе — Щит +5 КО, Обладунок мага, Політ.
   */
  import Icon from '../../components/Icon.svelte';
  import Toggle from '../../components/Toggle.svelte';
  import type { ItemMod, Spell } from '../../lib/model/types';
  import type { LibSpell } from '../../lib/library/types';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { loadSpells } from '../../lib/library';
  import { spellFx } from '../../lib/library/spellfx';
  import { castSpell, slotsLeft } from '../../lib/rules/spells';
  import { modText } from '../gear/modText';
  import { t } from '../../lib/i18n';
  import { onMount } from 'svelte';

  let { spell }: { spell: Spell } = $props();

  const c = $derived(charStore.current!);
  let lib = $state<LibSpell | null>(null);
  onMount(() => {
    loadSpells()
      .then((list) => {
        const nm = spell.name.trim().toLowerCase();
        lib = list.find((x) => x.id === spell.ref) ?? list.find((x) => x.n.toLowerCase() === nm || x.en.toLowerCase() === nm) ?? null;
      })
      .catch(() => {});
  });

  const conc = $derived(lib ? !!lib.co : /концентрац|concentration/i.test(spell.text));
  const fx = $derived<ItemMod[]>(spellFx(lib?.id ?? spell.ref));
  let onMe = $state(true);

  const levels = $derived(spell.level > 0 ? [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((l) => l >= spell.level && (c.spellcasting.slots[l]?.total ?? 0) > 0) : []);
  let picked = $state<number | null>(null);
  const slot = $derived(spell.level === 0 ? 0 : (picked ?? levels.find((l) => slotsLeft(c, l) > 0) ?? spell.level));
  const can = $derived(spell.level === 0 || slotsLeft(c, slot) > 0);

  function cast() {
    const name = spell.name.trim() || t('spells.unnamed');
    const plan = { name, slot, conc, fx: onMe && fx.length ? { mods: $state.snapshot(fx) as ItemMod[], duration: lib?.du ?? '' } : null };
    let ok = false;
    charStore.update(
      (ch) => {
        ok = castSpell(ch, plan);
      },
      {
        undo: () =>
          [
            t('spells.castDone', { name }),
            slot > 0 ? t('spells.castSlot', { n: slot, left: slotsLeft(charStore.current!, slot) }) : '',
            conc ? t('cond.concOn', { s: name }) : '',
            plan.fx ? plan.fx.mods.map(modText).join(', ') : '',
          ]
            .filter(Boolean)
            .join(' · '),
      },
    );
    if (!ok) picked = null;
  }
</script>

<div class="cast">
  {#if levels.length > 1}
    <div class="lv" role="radiogroup" aria-label={t('spells.castLevel')}>
      {#each levels as l (l)}
        <button class="chip" class:on={slot === l} disabled={slotsLeft(c, l) === 0} role="radio" aria-checked={slot === l} onclick={() => (picked = l)}>
          {t('spells.castLvlChip', { n: l, left: slotsLeft(c, l) })}
        </button>
      {/each}
    </div>
  {/if}
  {#if fx.length}
    <Toggle bind:checked={onMe} label={t('spells.castOnMe', { fx: fx.map(modText).join(', ') })} />
  {/if}
  <button class="btn btn-primary go" disabled={!can} onclick={cast}>
    <Icon name="sparkle" size={18} />
    {spell.level === 0 ? t('spells.castCantrip') : can ? t('spells.castBtn', { n: slot }) : t('spells.castNoSlot')}
    {#if conc}<span class="cc">{t('cond.conc')}</span>{/if}
  </button>
</div>

<style>
  .cast {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 10px;
  }
  .lv {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .go {
    align-self: flex-start;
    gap: 8px;
  }
  .cc {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.85;
  }
</style>
