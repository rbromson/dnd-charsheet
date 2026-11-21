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
  <button class="o" aria-label="−" disabled={value <= min} onclick={() => set(value - step)}><Icon name="minus" /></button>
  <span class="val num">{value}{suffix}</span>
  <button class="o" aria-label="+" disabled={value >= max} onclick={() => set(value + step)}><Icon name="plus" /></button>
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
    border-radius: 50%;
    border: 1.6px solid currentColor;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.85;
  }
  .o:disabled {
    opacity: 0.25;
  }
  .val {
    font-size: 24px;
    min-width: 48px;
    text-align: center;
  }
</style>
