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
  /* Вдавленный жёлоб; выбранный пункт — выпуклая «закладка» */
  .seg {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 15px;
    background: rgba(0, 0, 0, 0.34);
    box-shadow:
      inset 0 2px 5px rgba(0, 0, 0, 0.5),
      inset 0 0 0 1px rgba(0, 0, 0, 0.35),
      0 1px 0 rgba(255, 220, 170, 0.06);
  }
  :global(.card) .seg,
  :global(.sheet) .seg {
    background: rgba(90, 60, 30, 0.12);
    box-shadow:
      inset 0 2px 4px rgba(90, 60, 30, 0.22),
      inset 0 0 0 1px rgba(150, 112, 62, 0.35),
      0 1px 0 rgba(255, 250, 235, 0.6);
  }
  button {
    flex: 1;
    min-height: var(--tap);
    padding: 0 10px;
    border-radius: 11px;
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    color: #b9a487;
    transition:
      background-color 0.2s,
      color 0.2s,
      box-shadow 0.2s,
      transform 0.12s var(--ease);
  }
  button:active {
    transform: scale(0.96);
  }
  :global(.card) button,
  :global(.sheet) button {
    color: var(--ink2);
  }
  /* на тёмном — пергаментная закладка */
  button.on {
    color: var(--ink);
    background: var(--paper);
    background-size: 180px 180px, 520px 520px, 100% 100%;
    box-shadow:
      inset 0 0 0 1px rgba(150, 112, 62, 0.6),
      inset 0 1px 0 rgba(255, 250, 235, 0.65),
      inset 0 -2px 0 var(--ember),
      0 4px 10px -4px rgba(0, 0, 0, 0.7);
  }
  /* на пергаменте — кожаная закладка */
  :global(.card) button.on,
  :global(.sheet) button.on {
    color: var(--parch);
    background: var(--leather);
    background-size: var(--leather-size);
    box-shadow:
      inset 0 1px 0 rgba(255, 215, 165, 0.14),
      inset 0 0 0 1px rgba(0, 0, 0, 0.5),
      inset 0 -2px 0 var(--ember),
      0 3px 8px -3px rgba(60, 30, 10, 0.6);
  }
</style>
