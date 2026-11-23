<script lang="ts">
  /**
   * Действия предмета: «Випити», «Витратити заряди», «Вогняна куля»…
   * Кубики бросаются в окне кидка; лечение и списание — когда кость приземлится (без спойлеров).
   * Последний заряд жезла/посоха — бросок d20 с исходом из SRD.
   */
  import Icon from '../../components/Icon.svelte';
  import type { ItemPower } from '../../lib/model/types';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { applyHeal } from '../../lib/rules/hp';
  import { canUse, chargesOf, costRange, powerFormula, spellCast, spendPower } from '../../lib/rules/powers';
  import { removeItem } from '../../lib/rules/weapons';
  import { rollFormula } from '../../lib/dice/formula';
  import { cryptoRng } from '../../lib/dice/rng';
  import { t, dieText } from '../../lib/i18n';
  import { onMount } from 'svelte';
  import { loadSpells } from '../../lib/library';
  import { spellText } from '../../lib/library/apply';
  import type { LibSpell } from '../../lib/library/types';
  import { fmt } from '../../lib/rules/calc';

  /** pickOnly — лише вибір заклинання для сувою (картка нового предмета) */
  let { itemId, compact = false, pickOnly = false }: { itemId: string; compact?: boolean; pickOnly?: boolean } = $props();

  // заклинання з бібліотеки — для назв, кубиків за колом і тексту
  let spells = $state<Map<string, LibSpell>>(new Map());
  let spellList = $state<LibSpell[]>([]);
  let info = $state<Record<string, boolean>>({});
  onMount(() => {
    if (item?.powers.some((p) => p.spell !== null))
      loadSpells()
        .then((list) => {
          spellList = list;
          spells = new Map(list.map((x) => [x.id, x]));
        })
        .catch(() => {});
  });
  const libOf = (p: ItemPower) => (p.spell ? spells.get(p.spell) : undefined);
  const titleOf = (p: ItemPower) => {
    const lib = libOf(p);
    if (!lib) return p.name;
    return p.name === lib.n || p.name === lib.en ? lib.n : `${p.name}: ${lib.n}`;
  };
  /** что получится при этой цене: формула, результат, СК, атака */
  function plan(p: ItemPower, n: number) {
    const lib = libOf(p);
    if (c && lib) return spellCast(c, p, n, lib);
    return { formula: powerFormula(p, n), result: p.result, dc: p.dc, attack: null as number | null, level: 0 };
  }

  const c = $derived(charStore.current);
  const item = $derived(c?.equipment.find((x) => x.id === itemId));
  const charges = $derived(c && item ? chargesOf(c, item) : undefined);

  /** выбранная цена для действий с усилением */
  let amount = $state<Record<string, number>>({});
  let busy = $state(false);

  const nOf = (p: ItemPower) => {
    if (!c || !item) return 1;
    const [min, max] = costRange(c, item, p);
    return Math.min(Math.max(amount[p.id] ?? min, min), Math.max(min, max));
  };

  function icon(p: ItemPower) {
    return p.result === 'heal' || p.result === 'temp' ? 'heart' : p.result === 'damage' ? 'combat' : p.consume ? 'sparkle' : 'dice';
  }

  function use(p: ItemPower) {
    if (!c || !item || busy) return;
    const n = nOf(p);
    if (!canUse(c, item, p, n)) return;
    if (p.spell === '') {
      ui.toast(t('pw.pickSpellFirst'));
      return;
    }
    const name = item.name.trim() || t('gear.unnamed');
    const pl = plan(p, n);
    const label = `${name}: ${titleOf(p)}${pl.level ? ` · ${t('pw.lvl', { n: pl.level })}` : ''}`;
    // атакующее заклинание: сначала кидок атаки, шкода — кнопкой у вікні кидка
    if (pl.attack != null) {
      busy = true;
      dice.rollCheck({ kind: 'attack', label, bonus: pl.attack, damage: pl.formula || undefined, damageLabel: label });
      dice.whenLanded(dice.seq, () => {
        busy = false;
        apply(p, n, null);
      });
      return;
    }
    const f = pl.formula;
    if (!f) {
      apply(p, n, null);
      return;
    }
    busy = true;
    const e = dice.rollDamage(label, f, false, true);
    const total = e.type === 'formula' ? e.roll.total : 0;
    dice.whenLanded(dice.seq, () => {
      busy = false;
      apply(p, n, total);
    });
  }

  function apply(p: ItemPower, n: number, total: number | null) {
    const ch0 = charStore.current;
    if (!ch0) return;
    const name = item?.name.trim() || t('gear.unnamed');
    const from = ch0.hp.current;
    let res: ReturnType<typeof spendPower> = { emptied: null, usedUp: false };
    let healed = 0;
    const lib = libOf(p);
    charStore.update(
      (ch) => {
        res = spendPower(ch, itemId, p, n);
        if (total != null && p.self && p.result === 'heal') {
          const next = applyHeal(ch.hp, total);
          healed = next.current - from;
          ch.hp = next;
          if (from === 0 && next.current > 0) ch.deathSaves = { success: 0, fail: 0 };
        }
        if (total != null && p.self && p.result === 'temp') ch.hp.temp = Math.max(ch.hp.temp, total);
      },
      {
        undo: () => {
          const bits = [`«${name}»`];
          if (lib) bits.push(t('pw.cast', { spell: lib.n }));
          if (total != null && p.self && p.result === 'heal') bits.push(t('pw.healed', { n: healed, from, to: from + healed }));
          else if (total != null && p.self && p.result === 'temp') bits.push(t('pw.temp', { n: total }));
          if (p.cost > 0 && charges) bits.push(t('pw.chargesLeft', { n: res.emptied ? 0 : (charStore.current?.resources.find((r) => r.id === charges.id)?.current ?? 0) }));
          if (res.usedUp) bits.push(t('pw.usedUp'));
          return bits.join(' · ');
        },
      },
    );
    if (res.emptied?.onEmpty) lastCharge(name, res.emptied.id, res.emptied.onEmpty);
  }

  /** Последний заряд: d20 с исходом из SRD. */
  function lastCharge(name: string, resId: string, risk: NonNullable<import('../../lib/model/types').Resource['onEmpty']>) {
    const e = dice.rollDamage(t('pw.lastCharge', { name }), `1d${risk.die}`, false, true);
    const v = e.type === 'formula' ? e.roll.total : 0;
    dice.whenLanded(dice.seq, () => {
      if (!risk.on.includes(v)) {
        ui.toast(t('pw.riskSafe', { name }));
        return;
      }
      if (risk.kind === 'gain') {
        const got = Math.max(0, rollFormula(risk.gain, { rng: cryptoRng }).total);
        charStore.update(
          (ch) => {
            const r = ch.resources.find((x) => x.id === resId);
            if (r) r.current = Math.min(r.max, r.current + got);
          },
          { undo: t('pw.riskGain', { name, n: got }) },
        );
        return;
      }
      charStore.update(
        (ch) => {
          if (risk.kind === 'destroy') {
            removeItem(ch, itemId);
            return;
          }
          const it = ch.equipment.find((x) => x.id === itemId);
          if (!it) return;
          // втрачає чари: без зарядів і дій; «partial» лишає +N
          ch.resources = ch.resources.filter((r) => r.id !== resId);
          it.resourceId = null;
          it.powers = [];
          if (risk.kind === 'mundane') {
            it.magic = false;
            it.bonus = 0;
            it.attune = false;
            it.attuned = false;
          }
        },
        { undo: t(`pw.risk.${risk.kind}`, { name }) },
      );
    });
  }
</script>

{#if item && c && item.powers.length}
  <div class="pw" class:compact>
    {#if charges && !pickOnly}
      <div class="chg">
        <Icon name="sparkle" size={14} />
        <span class="num">{t('pw.charges', { n: charges.current, max: charges.max })}</span>
        {#if charges.regain}<span class="muted">· {t('pw.regain', { f: dieText(charges.regain) })}</span>{/if}
        {#if charges.onEmpty && charges.onEmpty.kind !== 'gain'}<span class="warn">· {t('pw.lastWarn')}</span>{/if}
      </div>
    {/if}
    {#each item.powers as p (p.id)}
      {@const [min, max] = costRange(c, item, p)}
      {@const n = nOf(p)}
      {@const pl = plan(p, n)}
      {@const f = pl.formula}
      {#if p.spell === ''}
        <!-- сувій: спершу обрати заклинання цього кола -->
        <label class="pick">
          <span class="label">{t('pw.pickSpell', { n: p.level })}</span>
          <select class="field" onchange={(e) => (p.spell = (e.currentTarget as HTMLSelectElement).value)}>
            <option value="">—</option>
            {#each spellList.filter((x) => x.l === p.level).sort((a, b) => a.n.localeCompare(b.n)) as sp (sp.id)}
              <option value={sp.id}>{sp.n}</option>
            {/each}
          </select>
        </label>
      {:else if !pickOnly}
      <div class="row">
        <button class="btn btn-outline use" disabled={busy || max < min} onclick={() => use(p)}>
          <Icon name={p.spell ? 'spells' : icon(p)} size={18} />
          <span class="nm">{titleOf(p)}</span>
          {#if p.cost > 0 && charges}<span class="cost num">{t('pw.costShort', { n })}</span>{/if}
          {#if f}<span class="f num">{dieText(f)}</span>{/if}
        </button>
        {#if libOf(p)}
          <button class="btn btn-ghost inf" class:on={info[p.id]} aria-label={t('pw.spellText')} onclick={() => (info[p.id] = !info[p.id])}><Icon name="help" size={18} /></button>
        {/if}
        {#if (p.costMax ?? 0) > Math.max(1, p.cost)}
          <span class="amt">
            <button class="key-tile k" aria-label="−" disabled={n <= min} onclick={() => (amount[p.id] = n - 1)}><Icon name="minus" size={14} /></button>
            <span class="num v">{n}</span>
            <button class="key-tile k" aria-label="+" disabled={n >= max} onclick={() => (amount[p.id] = n + 1)}><Icon name="plus" size={14} /></button>
          </span>
        {/if}
      </div>
      {#if pl.level || pl.dc || pl.attack != null || p.note}
        <div class="meta">
          {[
            pl.level ? t('pw.lvl', { n: pl.level }) : '',
            pl.dc ? t('pw.dc', { dc: pl.dc, ab: p.save ? t(`abilityShort.${p.save}`) : '' }) + (p.dcUser ? ` ${t('pw.yours')}` : '') : '',
            pl.attack != null ? t('pw.attack', { n: fmt(pl.attack) }) : '',
            p.note,
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      {/if}
      {#if info[p.id] && libOf(p)}
        <div class="stext serif">{spellText(libOf(p)!)}</div>
      {/if}
      {/if}
    {/each}
  </div>
{/if}

<style>
  .pw {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
  }
  .chg {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: var(--ink);
  }
  .chg :global(svg) {
    color: #9a6a2a;
  }
  .muted {
    color: var(--ink2);
  }
  .warn {
    color: #a3382a;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .use {
    flex: 1;
    min-width: 0;
    justify-content: flex-start;
    padding: 0 14px;
  }
  .nm {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .f {
    margin-left: auto;
    font-family: var(--font-sans);
    font-variant-numeric: tabular-nums;
  }
  .amt {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .k {
    width: 34px;
    height: 34px;
  }
  .v {
    min-width: 18px;
    text-align: center;
    font-weight: 700;
  }
  .cost {
    font-family: var(--font-sans);
    font-size: 12px;
    opacity: 0.8;
  }
  .inf {
    width: 40px;
    padding: 0;
    flex-shrink: 0;
  }
  .stext {
    font-size: 13.5px;
    line-height: 1.5;
    white-space: pre-line;
    padding: 8px 10px;
    border-radius: 3px;
    background: rgba(42, 31, 23, 0.05);
  }
  .pick {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .meta {
    margin-top: -2px;
    font-size: 12.5px;
    color: var(--ink2);
  }
</style>
