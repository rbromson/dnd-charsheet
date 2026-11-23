<script lang="ts">
  /**
   * «Підвищити рівень»: який клас отримав рівень (мультиклас), ОЗ — середнє або кидок кубика + Статура.
   * Решта (нові вміння, комірки) — нагадування: правила класів тут не зашиті.
   */
  import SheetFrame from '../../components/SheetFrame.svelte';
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { averageHp, pools } from '../../lib/rules/hitdice';
  import { levelUp } from '../../lib/rules/levelup';
  import { fmt, mod, profBonusForLevel } from '../../lib/rules/calc';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  const ps = $derived(c ? pools(c) : []);
  let pool = $state('main');
  const die = $derived((ps.find((p) => p.id === pool)?.die ?? c?.hitDice.die ?? 'd8').toLowerCase());
  const con = $derived(c ? mod(c, 'con') : 0);
  const avg = $derived(Math.max(1, averageHp(die) + con));
  let busy = $state(false);

  function apply(roll: number) {
    const cur = charStore.current;
    if (!cur) return;
    const profFrom = profBonusForLevel(cur.level);
    let res = { level: cur.level, hp: 0 };
    charStore.update(
      (ch) => {
        res = levelUp(ch, pool, roll);
      },
      {
        undo: () =>
          [
            t('lvl.done', { n: res.level }),
            t('lvl.hp', { n: res.hp }),
            profBonusForLevel(res.level) !== profFrom ? t('lvl.prof', { from: fmt(profFrom), to: fmt(profBonusForLevel(res.level)) }) : '',
          ]
            .filter(Boolean)
            .join(' · '),
      },
    );
    busy = false;
    ui.closeSheet();
  }

  function take() {
    apply(averageHp(die));
  }
  function roll() {
    if (busy) return;
    busy = true;
    const e = dice.rollDamage(t('lvl.rollLabel', { n: c.level + 1 }), `1${die}`, false, true);
    const v = e.type === 'formula' ? e.roll.total : averageHp(die);
    // ОЗ додаються, коли кістка приземлиться (без спойлера)
    dice.whenLanded(dice.seq, () => apply(v));
  }
</script>

{#if c}
  <SheetFrame kicker={t('lvl.kicker')} title={t('lvl.title', { from: c.level, to: Math.min(20, c.level + 1) })}>
    {#if ps.length > 1}
      <div>
        <span class="label">{t('lvl.which')}</span>
        <div class="pools">
          {#each ps as p (p.id)}
            <button class="chip" class:on={pool === p.id} aria-pressed={pool === p.id} onclick={() => (pool = p.id)}>{(p.die || 'd8').toLowerCase()} · {p.total}</button>
          {/each}
        </div>
      </div>
    {/if}
    <p class="lead">{t('lvl.hpLead', { die, con: fmt(con) })}</p>
    <div class="ways">
      <button class="btn btn-primary" disabled={busy || c.level >= 20} onclick={take}><Icon name="heart" size={18} />{t('lvl.avg', { n: avg })}</button>
      <button class="btn btn-outline" disabled={busy || c.level >= 20} onclick={roll}><Icon name="dice" size={18} />{t('lvl.roll', { die, con: fmt(con) })}</button>
    </div>
    <ul class="also">
      <li>{t('lvl.alsoHd', { die })}</li>
      {#if profBonusForLevel(c.level + 1) !== profBonusForLevel(c.level)}<li>{t('lvl.alsoProf', { n: fmt(profBonusForLevel(c.level + 1)) })}</li>{/if}
      <li>{t('lvl.alsoManual')}</li>
    </ul>
  </SheetFrame>
{/if}

<style>
  .pools {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .lead {
    margin: 0;
    font-size: 14px;
  }
  .ways {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .also {
    margin: 0;
    padding-left: 18px;
    font-size: 13px;
    color: var(--ink2);
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
</style>
