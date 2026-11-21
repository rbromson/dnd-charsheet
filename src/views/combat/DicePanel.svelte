<script lang="ts">
  /** Кнопка лотка кубиков и последние броски. Сам лоток — отдельный компонент (views/dice). */
  import Icon from '../../components/Icon.svelte';
  import { dice } from '../../lib/stores/dice.svelte';
  import { ui } from '../../lib/stores/ui.svelte';
  import { t } from '../../lib/i18n';

  const recent = $derived(dice.history.slice(0, 10));
</script>

<section class="panel">
  <button class="btn btn-primary open" onclick={() => (ui.diceTrayOpen = true)} aria-label={t('combat.openTray')}>
    <Icon name="dice" size={24} />{t('combat.dice')}
  </button>

  <h3 class="card-title">{t('combat.history')}</h3>
  {#if recent.length === 0}
    <div class="empty">{t('combat.historyEmpty')}</div>
  {:else}
    <ul>
      {#each recent as e (e.id)}
        {@const crit = e.type === 'd20' && e.roll.crit}
        {@const fumble = e.type === 'd20' && e.roll.fumble}
        <li>
          <span class="lb">{e.label}</span>
          {#if e.type === 'formula'}<span class="f">{e.roll.formula}</span>{/if}
          <b class="num" class:crit class:fumble>{e.roll.total}</b>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .open {
    width: 100%;
    min-height: 60px;
    font-size: 17px;
    border-radius: var(--r);
    margin-bottom: 14px;
    box-shadow: 0 0 22px var(--ember-glow);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 8px 2px;
    border-bottom: 1px solid var(--line);
    font-size: 14px;
  }
  li:last-child {
    border-bottom: none;
  }
  .lb {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
  }
  .f {
    font-size: 12px;
    color: var(--muted);
  }
  b {
    font-size: 20px;
    color: var(--parch);
    min-width: 32px;
    text-align: right;
  }
  b.crit {
    color: var(--gold);
    text-shadow: 0 0 10px var(--gold-glow);
  }
  b.fumble {
    color: var(--bad);
  }
</style>
