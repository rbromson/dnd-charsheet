<script lang="ts">
  /**
   * Действия предмета: «Випити», «Витратити заряди», «Вогняна куля»…
   * Кубики бросаются в окне кидка; лечение и списание — когда кость приземлится (без спойлеров).
   * Последний заряд жезла/посоха — бросок d20 с исходом из SRD.
   */
  import Icon from '../../components/Icon.svelte';
  import type { ItemMod, ItemPower } from '../../lib/model/types';
  import { uid } from '../../lib/model/ids';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { applyHeal } from '../../lib/rules/hp';
  import { canUse, chargesOf, costRange, powerFormula, spellCast, spendPower, studyBook, usesLeft } from '../../lib/rules/powers';
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

  /** «раз до світанку», «3 рази до світанку», «раз на 7 днів»; вичерпано — коли знову */
  function usesText(p: ItemPower): string {
    const u = p.uses;
    if (!u) return '';
    const few = u.days % 10 >= 2 && u.days % 10 <= 4 && (u.days < 10 || u.days > 20);
    if (u.used >= u.max) return u.days === 1 ? t('pw.untilDawn') : t(few ? 'pw.waitDays2' : 'pw.waitDays', { n: u.days });
    if (u.days > 1) return t(few ? 'pw.perDays2' : 'pw.perDays', { n: u.days });
    return u.max === 1 ? t('pw.oncePerDawn') : t('pw.timesPerDawn', { n: u.max });
  }

  /** «Минули дні» — ріг Валгалли, фігурки: відновити вручну */
  function resetUses(p: ItemPower) {
    const name = item?.name.trim() || t('gear.unnamed');
    charStore.update(
      (ch) => {
        const pw = ch.equipment.find((x) => x.id === itemId)?.powers.find((x) => x.id === p.id);
        if (pw?.uses) pw.uses.used = 0;
      },
      { undo: t('pw.usesReset', { name: `${name}: ${p.name}` }) },
    );
  }

  function icon(p: ItemPower) {
    if (p.boost) return 'star';
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
    // посібник/том: +2 назавжди
    if (p.boost) {
      const ab = t(`ability.${p.boost}`);
      let got: { from: number; to: number } | null = null;
      charStore.update(
        (ch) => {
          got = studyBook(ch, itemId, p, { name: name, text: t('pw.bookFeature', { a: ab }) });
        },
        { undo: () => (got ? t('pw.bookRead', { name, a: ab, from: got.from, to: got.to }) : name) },
      );
      return;
    }
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
        // зілля з тривалим ефектом — ефект на персонажі, доки його не знімуть
        if (p.effect) ch.effects.push({ id: uid(), source: name, name: p.effect.name || name, mods: $state.snapshot(p.effect.mods) as ItemMod[], duration: p.effect.duration, conc: false });
      },
      {
        undo: () => {
          const bits = [`«${name}»`];
          if (lib) bits.push(t('pw.cast', { spell: lib.n }));
          if (total != null && p.self && p.result === 'heal') bits.push(t('pw.healed', { n: healed, from, to: from + healed }));
          else if (total != null && p.self && p.result === 'temp') bits.push(t('pw.temp', { n: total }));
          if (p.cost > 0 && charges) bits.push(t('pw.chargesLeft', { n: res.emptied ? 0 : (charStore.current?.resources.find((r) => r.id === charges.id)?.current ?? 0) }));
          if (p.effect) bits.push(t('pw.effectOn', { name: p.effect.name || name, dur: p.effect.duration }));
          if (p.uses) {
            const pw = charStore.current?.equipment.find((x) => x.id === itemId)?.powers.find((x) => x.id === p.id);
            const left = pw ? usesLeft(pw) : 0;
            if (pw?.uses) bits.push(left ? t('pw.usesLeft', { n: left }) : usesText(pw));
          }
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
          {#if p.boost}<span class="f num">{t(`abilityShort.${p.boost}`)} +2</span>{/if}
        </button>
        {#if libOf(p)}
          <button class="btn btn-ghost inf" class:on={info[p.id]} aria-label={t('pw.spellText')} onclick={() => (info[p.id] = !info[p.id])}><Icon name="help" size={18} /></button>
        {/if}
        {#if p.uses}
          {@const left = usesLeft(p) ?? 0}
          {#if left === 0 && p.uses.days > 1}
            <button class="key-tile k" aria-label={t('pw.usesResetBtn', { n: p.uses.days })} title={t('pw.usesResetBtn', { n: p.uses.days })} onclick={() => resetUses(p)}><Icon name="undo" size={14} /></button>
          {:else}
            <span class="pips" aria-label={t('pw.usesLeft', { n: left })}>
              {#each Array.from({ length: p.uses.max }, (_, k) => k) as k (k)}<i class:on={k < left}></i>{/each}
            </span>
          {/if}
        {/if}
        {#if (p.costMax ?? 0) > Math.max(1, p.cost)}
          <span class="amt">
            <button class="key-tile k" aria-label="−" disabled={n <= min} onclick={() => (amount[p.id] = n - 1)}><Icon name="minus" size={14} /></button>
            <span class="num v">{n}</span>
            <button class="key-tile k" aria-label="+" disabled={n >= max} onclick={() => (amount[p.id] = n + 1)}><Icon name="plus" size={14} /></button>
          </span>
        {/if}
      </div>
      {#if pl.level || pl.dc || pl.attack != null || p.note || p.uses}
        <div class="meta">
          {#if p.uses}<span class:spent={p.uses.used >= p.uses.max}>{usesText(p)}</span>{#if pl.level || pl.dc || pl.attack != null || p.note}{' · '}{/if}{/if}{[
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
  .meta .spent {
    color: #a3382a;
  }
  /* «раз на день»: гранати-гнізда, заповнені — ще доступно */
  .pips {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    padding: 0 2px;
  }
  .pips i {
    width: 11px;
    height: 11px;
    transform: rotate(45deg);
    border-radius: 2px;
    box-shadow: inset 0 0 0 1.5px rgba(150, 112, 62, 0.7);
    background: rgba(42, 31, 23, 0.06);
  }
  .pips i.on {
    background: linear-gradient(135deg, #f0c766, #9a6a2a);
    box-shadow:
      inset 0 0 0 1px rgba(90, 60, 20, 0.6),
      0 1px 2px rgba(0, 0, 0, 0.3);
  }
</style>
