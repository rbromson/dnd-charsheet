<script lang="ts">
  /** «Від предметів»: що зараз дають надіті/налаштовані предмети — чуття, швидкості, бонуси й умовні ефекти. */
  import { charStore } from '../../lib/stores/characters.svelte';
  import { itemActive, toggleReady } from '../../lib/rules/calc';
  import { modText } from '../gear/modText';
  import { dieText, t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  type Row = { key: string; name: string; lines: { text: string; hint: boolean }[]; effectId?: string; dur?: string };
  const rows = $derived.by(() => {
    const out: Row[] = [];
    // выпитые зелья и другие временные эффекты — сверху, их можно снять
    for (const e of c.effects)
      out.push({ key: e.id, name: e.name, effectId: e.id, dur: e.duration, lines: e.mods.map((m) => ({ text: modText(m), hint: !!m.when })) });
    for (const i of c.equipment) {
      if (toggleReady(i))
        for (const tg of i.toggles)
          if (tg.on)
            out.push({
              key: tg.id,
              name: `${i.name}: ${tg.name}`,
              lines: [...tg.extra.map((x) => ({ text: `+${dieText(x.dice)} ${x.type}`, hint: false })), ...tg.mods.map((m) => ({ text: modText(m), hint: !!m.when }))],
            });
      if (itemActive(i) && i.mods.length) out.push({ key: i.id, name: i.name, lines: i.mods.map((m) => ({ text: modText(m), hint: !!m.when })) });
    }
    return out;
  });

  function end(id: string, name: string) {
    charStore.update(
      (ch) => {
        ch.effects = ch.effects.filter((e) => e.id !== id);
      },
      { undo: t('fx.removed', { name }) },
    );
  }
</script>

{#if rows.length}
  <section class="card">
    <h3 class="card-title">{t('mod.title')}</h3>
    {#each rows as r (r.key)}
      <div class="it" class:fx={!!r.effectId}>
        <div class="hd">
          <div class="nm serif">{r.name}{#if r.dur}<span class="dur"> · {r.dur}</span>{/if}</div>
          {#if r.effectId}<button class="btn btn-ghost rm" onclick={() => end(r.effectId!, r.name)}>{t('fx.remove')}</button>{/if}
        </div>
        {#each r.lines as l, i (i)}<div class="ln" class:hint={l.hint}>{l.text}</div>{/each}
      </div>
    {/each}
  </section>
{/if}

<style>
  .it {
    padding: 6px 0;
    border-bottom: 1px dashed color-mix(in srgb, var(--ink2) 25%, transparent);
  }
  .it:last-child {
    border-bottom: none;
  }
  .hd {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .hd .nm {
    flex: 1;
    min-width: 0;
  }
  .dur {
    font-family: var(--font-sans);
    font-weight: 500;
    font-size: 12.5px;
    color: var(--ink2);
  }
  .rm {
    min-height: 32px;
    padding: 0 8px;
    font-size: 13px;
  }
  .fx {
    background: linear-gradient(90deg, rgba(230, 180, 80, 0.18), transparent 70%);
    padding-left: 8px;
    margin: 0 -8px;
    border-radius: 3px;
  }
  .nm {
    font-weight: 700;
    font-size: 14.5px;
  }
  .ln {
    font-size: 13.5px;
    line-height: 1.45;
  }
  .ln.hint {
    color: var(--ink2);
    font-style: italic;
  }
</style>
