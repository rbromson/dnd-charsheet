<script lang="ts" generics="T extends string | number | null">
  let {
    value = $bindable(),
    options,
    onchange,
  }: { value: T; options: { value: T; label: string }[]; onchange?: (v: T) => void } = $props();
</script>

<div class="seg" role="radiogroup">
  {#each options as o (o.value)}
    <button
      role="radio"
      aria-checked={value === o.value}
      class:on={value === o.value}
      onclick={() => {
        value = o.value;
        onchange?.(o.value);
      }}>{o.label}</button
    >
  {/each}
</div>

<style>
  /* Переключатель в духе RPG-вкладок: жёлоб в бронзовой рамке, выбранный пункт — пластина в золоте */
  .seg {
    --cut: 9px;
    position: relative;
    isolation: isolate;
    display: flex;
    gap: 3px;
    padding: 5px;
    border-radius: 2px;
    clip-path: polygon(var(--cut) 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, var(--cut) 100%, 0 calc(100% - var(--cut)), 0 var(--cut));
    background: var(--frame-bronze);
  }
  .seg::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    z-index: -1;
    clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px);
    background: linear-gradient(180deg, #120c09, #1d1510);
    box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.7);
  }
  :global(.card) .seg::before,
  :global(.sheet) .seg::before {
    background: linear-gradient(180deg, #d9c49c, #e8d8b6);
    box-shadow: inset 0 2px 6px rgba(80, 50, 20, 0.35);
  }
  button {
    --c: 6px;
    position: relative;
    isolation: isolate;
    flex: 1;
    min-height: calc(var(--tap) - 4px);
    padding: 0 10px;
    border-radius: 2px;
    clip-path: polygon(var(--c) 0, calc(100% - var(--c)) 0, 100% var(--c), 100% calc(100% - var(--c)), calc(100% - var(--c)) 100%, var(--c) 100%, 0 calc(100% - var(--c)), 0 var(--c));
    font-family: var(--font-sc);
    font-weight: 700;
    font-size: 14.5px;
    letter-spacing: 0.03em;
    white-space: nowrap;
    color: #a8957c;
    transition:
      color 0.2s,
      transform 0.12s var(--ease);
  }
  button:active {
    transform: scale(0.96);
  }
  :global(.card) button,
  :global(.sheet) button {
    color: #6b5a48;
  }
  button.on {
    color: #ffe6b8;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.7), 0 0 10px rgba(255, 170, 90, 0.35);
    background: var(--frame-gold);
  }
  button.on::before {
    content: '';
    position: absolute;
    inset: 1.5px;
    z-index: -1;
    clip-path: polygon(5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px), 0 5px);
    background:
      radial-gradient(ellipse 80% 60% at 50% 110%, rgba(232, 116, 59, 0.55), transparent 70%),
      radial-gradient(ellipse 120% 100% at 50% 0%, #4a372b, #24190f 100%);
    box-shadow: inset 0 1px 0 rgba(255, 230, 190, 0.2);
  }
  @media (max-width: 420px) {
    button {
      padding: 0 4px;
      font-size: 13px;
    }
  }
</style>
