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
  .seg {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
    background: rgba(0, 0, 0, 0.18);
  }
  :global(.card) .seg {
    background: rgba(42, 31, 23, 0.08);
  }
  button {
    flex: 1;
    min-height: 44px;
    padding: 0 10px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
  }
  button.on {
    background: var(--ember);
    color: var(--ember-ink);
  }
  :global(.card) button.on {
    background: var(--ink);
    color: var(--parch);
  }
</style>
