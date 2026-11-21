<script lang="ts">
  /** Блок одного уровня заклинаний: слоты (1–9) и список заклинаний. */
  import Icon from '../../components/Icon.svelte';
  import Stepper from '../../components/Stepper.svelte';
  import RowActions from '../../components/RowActions.svelte';
  import SpellSheet from './SpellSheet.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui, buzz } from '../../lib/stores/ui.svelte';
  import { press } from '../../lib/actions/press';
  import { uid } from '../../lib/model/ids';
  import { t } from '../../lib/i18n';

  let { level }: { level: number } = $props();

  const c = $derived(charStore.current!);
  const slot = $derived(level > 0 ? c.spellcasting.slots[level] : null);
  const spells = $derived(c.spells.filter((s) => s.level === level));
  const left = $derived(slot ? Math.max(0, slot.total - slot.used) : 0);

  let open = $state<Record<string, boolean>>({});

  function edit(id: string) {
    ui.openSheet(SpellSheet, { id });
  }

  function tapSpell(id: string) {
    if (ui.editing) edit(id);
    else open[id] = !open[id];
  }

  function tapSlot(i: number) {
    if (!slot) return;
    const spend = i >= slot.used;
    if (spend && slot.used >= slot.total) return;
    charStore.update(
      (ch) => {
        const s = ch.spellcasting.slots[level];
        s.used = Math.min(s.total, Math.max(0, s.used + (spend ? 1 : -1)));
      },
      { undo: t(spend ? 'spells.slotSpent' : 'spells.slotRestored', { n: level }) },
    );
    buzz(spend ? 20 : 10);
  }

  function setTotal(v: number) {
    const s = c.spellcasting.slots[level];
    if (s.used > v) s.used = v;
  }

  function add() {
    const id = uid();
    c.spells.push({ id, level, name: '', prepared: false, text: '' });
    edit(id);
  }

  /** Поменять местами с соседним заклинанием того же уровня. */
  function shift(id: string, dir: -1 | 1) {
    const arr = c.spells;
    const i = arr.findIndex((s) => s.id === id);
    let j = i + dir;
    while (j >= 0 && j < arr.length && arr[j].level !== level) j += dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }

  async function remove(id: string) {
    const s = c.spells.find((x) => x.id === id);
    if (!s) return;
    const name = s.name.trim() || t('spells.unnamed');
    const ok = await ui.confirm(t('spells.deleteConfirm', { name }), { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    charStore.update(
      (ch) => {
        ch.spells = ch.spells.filter((x) => x.id !== id);
      },
      { undo: t('spells.deleted', { name }) },
    );
  }
</script>

<section class="card lvl">
  <header>
    <span class="badge num" class:zero={level === 0}>{level}</span>
    <div class="grow">
      <h3 class="sc">{level === 0 ? t('spells.cantrips') : t('spells.levelN', { n: level })}</h3>
      {#if slot && !ui.editing}
        <div class="sub">{slot.total > 0 ? t('spells.slotsLeft', { left, total: slot.total }) : t('spells.noSlots')}</div>
      {/if}
    </div>
    {#if slot && ui.editing}
      <div class="tot">
        <span class="label">{t('spells.slotsTotal')}</span>
        <Stepper bind:value={slot.total} min={0} max={9} onchange={setTotal} />
      </div>
    {/if}
  </header>

  {#if slot && slot.total > 0}
    <div class="slots" role="group" aria-label={t('spells.slotsUsed')}>
      {#each Array.from({ length: slot.total }, (_, i) => i) as i (i)}
        <button
          class="slot"
          aria-label={t('spells.slotAria', { i: i + 1, n: level })}
          aria-pressed={i < slot.used}
          onclick={() => tapSlot(i)}
        >
          <span class="circ" class:used={i < slot.used}></span>
        </button>
      {/each}
    </div>
  {/if}

  {#if spells.length}
    <ul class="list">
      {#each spells as s, idx (s.id)}
        <li class:open={open[s.id] && !ui.editing}>
          <div class="line">
            {#if level > 0}
              <button
                class="prep"
                role="checkbox"
                aria-checked={s.prepared}
                aria-label={t('spells.preparedAria', { name: s.name || t('spells.unnamed') })}
                onclick={() => (s.prepared = !s.prepared)}
              >
                <span class="dot" class:on={s.prepared}></span>
              </button>
            {:else}
              <span class="spark" aria-hidden="true"><Icon name="sparkle" size={16} /></span>
            {/if}
            <button
              class="name"
              use:press={{ onTap: () => tapSpell(s.id), onLong: () => edit(s.id) }}
              onclick={(e) => {
                if (e.detail === 0) tapSpell(s.id);
              }}
            >
              <span class="nm serif" class:unnamed={!s.name.trim()}>{s.name.trim() || t('spells.unnamed')}</span>
              {#if !ui.editing && s.text.trim()}
                <span class="chev"><Icon name="down" size={18} /></span>
              {/if}
            </button>
            {#if ui.editing}
              <RowActions
                onUp={idx > 0 ? () => shift(s.id, -1) : undefined}
                onDown={idx < spells.length - 1 ? () => shift(s.id, 1) : undefined}
                onDelete={() => remove(s.id)}
              />
            {/if}
          </div>
          {#if open[s.id] && !ui.editing}
            <div class="desc serif">{s.text.trim() || t('spells.noText')}</div>
          {/if}
        </li>
      {/each}
    </ul>
  {:else if ui.editing}
    <div class="none muted">{t('spells.emptyLevel')}</div>
  {/if}

  {#if ui.editing}
    <button class="btn btn-ghost addbtn" onclick={add}><Icon name="plus" size={20} />{t('spells.add')}</button>
  {/if}
</section>

<style>
  .lvl {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  header {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .badge {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--ink);
    color: var(--parch);
    font-size: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .badge.zero {
    background: transparent;
    color: var(--ink);
    box-shadow: inset 0 0 0 2px var(--ink);
  }
  h3 {
    font-size: 17px;
    letter-spacing: 0.04em;
  }
  .sub {
    font-size: 12.5px;
    color: var(--ink2);
  }
  .tot {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .tot .label {
    margin: 0;
  }

  .slots {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -4px;
  }
  .slot {
    width: var(--tap);
    height: var(--tap);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .circ {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid var(--ink2);
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .circ.used {
    background: var(--ink);
    border-color: var(--ink);
    box-shadow: inset 0 0 0 4px var(--parch2);
  }
  .slot:active .circ {
    transform: scale(0.92);
  }

  .list {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    border-bottom: 1px dashed rgba(107, 90, 72, 0.3);
  }
  li:last-child {
    border-bottom: none;
  }
  .line {
    display: flex;
    align-items: center;
    min-height: var(--tap);
  }
  .prep {
    width: var(--tap);
    height: var(--tap);
    margin-left: -12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.8px solid var(--ink2);
  }
  .dot.on {
    background: var(--ink);
    border-color: var(--ink);
  }
  .spark {
    width: 36px;
    display: flex;
    justify-content: center;
    color: var(--ink2);
    flex-shrink: 0;
    margin-left: -6px;
  }
  .name {
    flex: 1;
    min-width: 0;
    min-height: var(--tap);
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
    user-select: none;
    -webkit-user-select: none;
  }
  .nm {
    flex: 1;
    min-width: 0;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.2;
    padding: 6px 0;
  }
  .nm.unnamed {
    color: var(--ink2);
    font-style: italic;
  }
  .chev {
    color: var(--ink2);
    transition: transform 0.15s;
    display: flex;
  }
  li.open .chev {
    transform: rotate(180deg);
  }
  .desc {
    white-space: pre-wrap;
    font-size: 15.5px;
    line-height: 1.55;
    padding: 2px 4px 12px 36px;
    color: var(--ink);
  }
  .none {
    font-size: 13px;
    padding: 4px 0;
  }
  .addbtn {
    align-self: flex-start;
    margin-left: -10px;
  }
</style>
