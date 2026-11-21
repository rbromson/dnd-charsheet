<script lang="ts">
  let { checked = $bindable(), label, onchange }: { checked: boolean; label: string; onchange?: (v: boolean) => void } = $props();
</script>

<button
  class="toggle"
  role="switch"
  aria-checked={checked}
  onclick={() => {
    checked = !checked;
    onchange?.(checked);
  }}
>
  <span class="grow">{label}</span>
  <span class="track" class:on={checked}><span class="knob"></span></span>
</button>

<style>
  .toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: var(--tap);
    width: 100%;
    text-align: left;
    font-size: 15px;
  }
  .track {
    width: 48px;
    height: 28px;
    border-radius: 14px;
    background: rgba(127, 110, 90, 0.4);
    position: relative;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .track.on {
    background: var(--ember);
  }
  .knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.15s;
  }
  .on .knob {
    transform: translateX(20px);
  }
</style>
