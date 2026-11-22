<script lang="ts">
  /** Рятунок від смерті: 3 успіхи + 3 провали, тап — переключить, «Кинути» — d20. Крупно, когда хиты = 0. */
  import Icon from '../../components/Icon.svelte';
  import { charStore } from '../../lib/stores/characters.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { buzz } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  const c = $derived(charStore.current!);
  const down = $derived(c.hp.current === 0 && c.hp.max > 0);
  const ds = $derived(c.deathSaves);

  function tap(kind: 'success' | 'fail', i: number) {
    const cur = c.deathSaves[kind];
    c.deathSaves[kind] = i < cur ? i : i + 1;
    buzz(10);
  }

  const status = $derived(ds.success >= 3 ? t('combat.stable') : ds.fail >= 3 ? t('combat.dead') : '');
</script>

{#snippet sockets(kind: 'success' | 'fail', big: boolean)}
  {@const n = kind === 'success' ? ds.success : ds.fail}
  {@const label = t(kind === 'success' ? 'combat.deathSuccess' : 'combat.deathFail')}
  <div class="grp {kind === 'success' ? 'ok' : 'ko'}" class:big>
    <span class="gl"><Icon name={kind === 'success' ? 'check' : 'close'} size={13} stroke={2.6} />{label}</span>
    <div class="circles">
      {#each [0, 1, 2] as i (i)}
        <button class="sock" class:on={i < n} aria-label={`${label} ${i + 1}`} aria-pressed={i < n} onclick={() => tap(kind, i)}>
          <span class="gem">{#if i < n}<Icon name={kind === 'success' ? 'check' : 'close'} size={big ? 20 : 15} stroke={3} />{/if}</span>
        </button>
      {/each}
    </div>
  </div>
{/snippet}

<section class="card ds" class:down>
  <h3 class="card-title" class:big-t={down}>{t('combat.death')}</h3>
  {#if status && !down}<div class="st" class:bad={ds.fail >= 3}>{status}</div>{/if}
  <div class="groups">
    {@render sockets('success', down)}
    <span class="sep" aria-hidden="true"></span>
    {@render sockets('fail', down)}
  </div>
  {#if down}
    {#if status}<div class="status" class:bad={ds.fail >= 3}>{status}</div>{/if}
    <button class="btn btn-danger roll" onclick={() => dice.rollDeathSave(t('combat.death'))}>
      <Icon name="dice" size={22} />{t('combat.deathRoll')}
    </button>
    <div class="hint">{t('combat.deathHint')}</div>
  {/if}
</section>

<style>
  .ds.down {
    box-shadow:
      inset 0 0 0 2px var(--bad),
      inset 0 0 40px color-mix(in srgb, var(--bad) 22%, transparent),
      0 0 24px color-mix(in srgb, var(--bad) 35%, transparent);
  }
  .big-t {
    font-size: 16px;
    color: var(--bad);
  }
  .st {
    margin: -4px 0 6px;
    text-align: center;
    font-size: 12.5px;
    font-weight: 700;
    color: var(--good);
  }
  .st.bad {
    color: var(--bad);
  }
  .groups {
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    gap: 6px;
  }
  .grp {
    /* на пергаменте нужен насыщеннее, чем общий --good */
    --c: #3f8a34;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .grp.ko {
    --c: #b8412c;
  }
  .gl {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--c) 80%, #000);
  }
  .grp.big .gl {
    font-size: 12.5px;
  }
  /* гравированный разделитель с ромбом */
  .sep {
    position: relative;
    width: 1px;
    margin: 4px 4px;
    background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--ink2) 45%, transparent) 20%, color-mix(in srgb, var(--ink2) 45%, transparent) 80%, transparent);
    box-shadow: 1px 0 0 rgba(255, 250, 235, 0.5);
  }
  .sep::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 8px;
    height: 8px;
    transform: translate(-50%, -50%) rotate(45deg);
    background: linear-gradient(135deg, #e9c27a, #9a6a2a);
    box-shadow: 0 0 0 2px var(--paper-base, #efe2c4);
  }
  .circles {
    display: flex;
    align-items: center;
  }
  /* гнездо: бронзовая оправа, утопленное дно, слабый отсвет цвета группы */
  .sock {
    width: var(--tap);
    height: var(--tap);
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .gem {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background:
      radial-gradient(circle at 50% 60%, color-mix(in srgb, var(--c) 30%, transparent), transparent 70%),
      radial-gradient(circle at 50% 35%, #d9c7a3, #b9a27a);
    box-shadow:
      inset 0 3px 5px rgba(60, 40, 15, 0.45),
      inset 0 -1px 0 rgba(255, 250, 235, 0.6),
      0 0 0 2px #a07a3e,
      0 0 0 3px #6e4d1f,
      0 2px 3px rgba(0, 0, 0, 0.3);
    transition:
      transform 0.12s var(--ease),
      box-shadow 0.2s,
      background 0.2s;
  }
  .grp.big .gem {
    width: 44px;
    height: 44px;
  }
  .grp.big .sock {
    width: 54px;
    height: 54px;
  }
  .sock:hover .gem {
    background:
      radial-gradient(circle at 50% 60%, color-mix(in srgb, var(--c) 40%, transparent), transparent 75%),
      radial-gradient(circle at 50% 35%, #dccaa6, #bca57d);
  }
  .sock:active .gem {
    transform: scale(0.88);
  }
  /* заполнено — светящийся камень */
  .sock.on .gem {
    background:
      radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.65), transparent 35%),
      radial-gradient(circle at 50% 55%, color-mix(in srgb, var(--c) 75%, #fff), var(--c) 55%, color-mix(in srgb, var(--c) 60%, #000));
    box-shadow:
      inset 0 -3px 5px rgba(0, 0, 0, 0.3),
      0 0 0 2px #c89a4e,
      0 0 0 3px #6e4d1f,
      0 0 12px color-mix(in srgb, var(--c) 70%, transparent);
    animation: set 0.28s var(--ease-spring);
  }
  .sock.on .gem :global(svg) {
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5));
  }
  .status {
    margin-top: 8px;
    text-align: center;
    font-weight: 700;
    color: var(--good);
  }
  .status.bad {
    color: var(--bad);
  }
  .roll {
    width: 100%;
    margin-top: 12px;
    min-height: 56px;
    font-size: 17px;
  }
  .hint {
    text-align: center;
    font-size: 12px;
    color: var(--ink2);
    margin-top: 6px;
  }
  @keyframes set {
    from {
      transform: scale(0.6);
    }
  }
</style>
