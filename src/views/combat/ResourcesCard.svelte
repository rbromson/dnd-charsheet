<script lang="ts">
  /** Ресурсы (пипсы / степпер) и кнопки отдыха. */
  import Stepper from '../../components/Stepper.svelte';
  import RowActions from '../../components/RowActions.svelte';
  import Icon from '../../components/Icon.svelte';
  import ResourceSheet from './ResourceSheet.svelte';
  import type { Resource } from '../../lib/model/types';
  import { press } from '../../lib/actions/press';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { ui, buzz } from '../../lib/stores/ui.svelte';
  import { applyRest, restPreview, type RestKind } from '../../lib/rules/rest';
  import { uid } from '../../lib/model/ids';
  import { move } from '../../lib/list';
  import { has, t } from '../../lib/i18n';

  const c = $derived(charStore.current!);

  const open = (id: string) => ui.openSheet(ResourceSheet, { id });

  function sub(r: Resource): string {
    return [
      t('combat.resCount', { cur: r.current, max: r.max }),
      r.die,
      t(`combat.recharge.${r.recharge}`),
      r.maxPerRoll != null ? t('combat.perRoll', { n: r.maxPerRoll }) : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  function change(id: string, delta: 1 | -1) {
    const r = c.resources.find((x) => x.id === id);
    if (!r) return;
    const cur = Math.min(r.max, Math.max(0, r.current + delta));
    if (cur === r.current) return;
    const msg = t(delta < 0 ? 'combat.resSpent' : 'combat.resRestored', { name: r.name, cur, max: r.max });
    charStore.update(
      (ch) => {
        const x = ch.resources.find((y) => y.id === id);
        if (x) x.current = cur;
      },
      { undo: msg },
    );
    buzz(delta < 0 ? 18 : 10);
  }

  function add() {
    const id = uid();
    c.resources.push({ id, name: t('combat.resNew'), max: 1, current: 1, die: null, recharge: 'long', maxPerRoll: null });
    open(id);
  }

  async function remove(r: Resource) {
    const name = r.name || t('combat.resNew');
    const ok = await ui.confirm(t('common.deleteConfirm', { name }), { danger: true, okLabel: t('common.delete') });
    if (!ok) return;
    charStore.update(
      (ch) => {
        const i = ch.resources.findIndex((x) => x.id === r.id);
        if (i >= 0) ch.resources.splice(i, 1);
      },
      { undo: t('common.deleted', { name }) },
    );
  }

  async function rest(kind: RestKind) {
    const preview = restPreview(c, kind).map(([k, v]) => {
      const key = `combat.restKey.${k}`;
      return `${['hp', 'temp', 'hitDice', 'slots'].includes(k) && has(key) ? t(key) : k}: ${v}`;
    });
    const ok = await ui.confirm(t(kind === 'short' ? 'combat.restAskShort' : 'combat.restAskLong'), {
      okLabel: t('combat.restOk'),
      details: preview.length ? preview : [t('combat.restNothing')],
    });
    if (!ok) return;
    charStore.update((ch) => applyRest(ch, kind), { undo: t(kind === 'short' ? 'combat.restDoneShort' : 'combat.restDoneLong') });
    buzz([15, 40, 15]);
  }
</script>

<section class="card">
  <h3 class="card-title">{t('combat.resources')}</h3>

  {#if c.resources.length === 0 && !ui.editing}
    <div class="empty">{t('combat.resEmpty')}</div>
  {/if}

  {#each c.resources as r, i (r.id)}
    <div class="res">
      <button
        class="info"
        class:editing={ui.editing}
        use:press={{ onTap: () => ui.editing && open(r.id), onLong: () => open(r.id) }}
      >
        <span class="n">{r.name || t('combat.resNew')}</span>
        <span class="d">{sub(r)}</span>
      </button>

      {#if ui.editing}
        <RowActions
          onUp={i > 0 ? () => move(c.resources, i, -1) : undefined}
          onDown={i < c.resources.length - 1 ? () => move(c.resources, i, 1) : undefined}
          onDelete={() => remove(r)}
        />
      {:else if r.max <= 12}
        <div class="pips" role="group" aria-label={r.name}>
          {#each Array.from({ length: r.max }, (_, k) => k) as k (k)}
            {@const full = k < r.current}
            <button
              class="pip"
              class:tri={!!r.die}
              class:full
              aria-label={full ? `−1 ${r.name}` : `+1 ${r.name}`}
              onclick={() => change(r.id, full ? -1 : 1)}
            >
              <span class="shape">{#if r.die && full}{r.die}{/if}</span>
            </button>
          {/each}
        </div>
      {:else}
        <Stepper bind:value={r.current} min={0} max={r.max} />
      {/if}
    </div>
  {/each}

  {#if ui.editing}
    <button class="btn btn-outline add" onclick={add}><Icon name="plus" size={20} />{t('common.add')}</button>
  {/if}

  <div class="rest">
    <button class="btn btn-outline" onclick={() => rest('short')}><Icon name="coffee" size={20} />{t('combat.restShort')}</button>
    <button class="btn btn-ink" onclick={() => rest('long')}><Icon name="moon" size={20} />{t('combat.restLong')}</button>
  </div>
</section>

<style>
  .res {
    display: flex;
    align-items: center;
    gap: 8px 12px;
    min-height: 60px;
    padding: 6px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--ink2) 20%, transparent);
    flex-wrap: wrap;
  }
  .info {
    flex: 1 1 150px;
    min-width: 0;
    min-height: var(--tap);
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: left;
    color: var(--ink);
    user-select: none;
  }
  .info.editing .n {
    text-decoration: underline dashed color-mix(in srgb, var(--ink2) 50%, transparent);
    text-underline-offset: 4px;
  }
  .n {
    font-weight: 600;
    font-size: 15px;
  }
  .d {
    font-size: 12px;
    color: var(--ink2);
  }
  .pips {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    margin-left: auto;
  }
  .pip {
    width: var(--tap);
    height: var(--tap);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .shape {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 2px solid var(--ink2);
    transition: background 0.12s;
  }
  .pip.full .shape {
    background: var(--ember);
    border-color: var(--ember);
  }
  .pip.tri .shape {
    border: none;
    border-radius: 0;
    width: 38px;
    height: 36px;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
    background: color-mix(in srgb, var(--ink) 18%, transparent);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 3px;
    font-size: 10.5px;
    font-weight: 800;
    color: var(--ember-ink);
  }
  .pip.tri.full .shape {
    background: var(--ember);
  }
  .pip:active .shape {
    transform: scale(0.9);
  }
  .add {
    margin-top: 10px;
  }
  .rest {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
  }
  .rest .btn {
    min-height: 52px;
    font-size: 14px;
    padding: 4px 10px;
    line-height: 1.2;
    text-align: center;
  }
</style>
