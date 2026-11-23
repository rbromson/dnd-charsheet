<script lang="ts">
  /** Выбор способа (новий персонаж, додати предмет/заклинання): таблички в бронзовій оправі. */
  import Icon from './Icon.svelte';

  export interface Way {
    icon: string;
    label: string;
    sub: string;
    onclick: () => void;
    /** главный способ — золотая оправа */
    accent?: boolean;
    /** ведёт на следующий шаг — стрелка справа */
    next?: boolean;
    disabled?: boolean;
  }

  let { ways }: { ways: Way[] } = $props();
</script>

<div class="ways">
  {#each ways as w (w.label)}
    <button class="way" class:ai={w.accent} disabled={w.disabled} onclick={w.onclick}>
      <span class="medal"><Icon name={w.icon} size={22} /></span>
      <span class="wt"><b>{w.label}</b><span>{w.sub}</span></span>
      {#if w.next}<Icon name="chevron" size={18} />{/if}
    </button>
  {/each}
</div>

<style>
  .ways {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  /* способ создания — табличка в бронзовой оправе со срезанными углами */
  .way {
    --cut: 9px;
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 76px;
    padding: 10px 14px;
    text-align: left;
    color: var(--ink);
    clip-path: polygon(var(--cut) 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, var(--cut) 100%, 0 calc(100% - var(--cut)), 0 var(--cut));
    background: var(--frame-bronze);
    transition: transform 0.1s;
  }
  .way::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    z-index: -1;
    clip-path: inherit;
    background: radial-gradient(ellipse 120% 100% at 50% 0%, #fffaf0 0%, #f3e6cb 55%, #e6d3ad 100%);
    box-shadow: inset 0 -6px 10px -6px rgba(110, 78, 40, 0.3);
  }
  .way:active {
    transform: scale(0.98);
  }
  .way[disabled] {
    opacity: 0.5;
  }
  .way.ai {
    background: var(--frame-gold);
  }
  .way.ai::before {
    background:
      radial-gradient(ellipse 60% 120% at 0% 50%, rgba(232, 116, 59, 0.22), transparent 70%),
      radial-gradient(ellipse 120% 100% at 50% 0%, #fffaf0 0%, #f6e7c6 55%, #ead3a4 100%);
  }
  .medal {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffd9a8;
    background: radial-gradient(circle at 50% 35%, #4a372b, #1d140f);
    box-shadow:
      0 0 0 2px #b08a4a,
      0 2px 4px rgba(60, 40, 15, 0.4);
  }
  .way.ai .medal {
    color: #fff0d6;
    background: radial-gradient(circle at 50% 35%, #f39a5c, #b0481c);
    box-shadow:
      0 0 0 2px #e3bd73,
      0 0 12px rgba(232, 116, 59, 0.45);
  }
  .wt {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .wt b {
    font-family: var(--font-sc);
    font-size: 17px;
  }
  .wt span {
    font-size: 13px;
    line-height: 1.35;
    color: var(--ink2);
  }
</style>
