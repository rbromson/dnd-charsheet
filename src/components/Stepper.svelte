<script lang="ts">
  import Icon from './Icon.svelte';
  let {
    value = $bindable(),
    min = -Infinity,
    max = Infinity,
    step = 1,
    suffix = '',
    onchange,
  }: { value: number; min?: number; max?: number; step?: number; suffix?: string; onchange?: (v: number) => void } = $props();

  function set(v: number) {
    value = Math.min(max, Math.max(min, v));
    onchange?.(value);
  }
</script>

<div class="stepper">
  <button class="o key-tile" aria-label="−" disabled={value <= min} onclick={() => set(value - step)}><Icon name="minus" /></button>
  <span class="val num">{value}{suffix}</span>
  <button class="o key-tile" aria-label="+" disabled={value >= max} onclick={() => set(value + step)}><Icon name="plus" /></button>
</div>

<style>
  .stepper {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .o {
    width: var(--tap);
    height: var(--tap);
    flex-shrink: 0;
  }
  .val {
    font-variant-numeric: lining-nums tabular-nums;
    font-size: 24px;
    min-width: 48px;
    text-align: center;
  }
</style>
