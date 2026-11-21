<script lang="ts">
  /** Кружок владения: пустой / закрашенный / с кольцом (экспертиза). */
  let { prof }: { prof: 0 | 1 | 2 } = $props();
</script>

<span class="dot" class:p={prof === 1} class:e={prof === 2} aria-hidden="true"></span>

<style>
  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1.6px solid var(--ink2);
    flex-shrink: 0;
    display: inline-block;
  }
  .p {
    background: var(--ink);
    border-color: var(--ink);
  }
  .e {
    background: var(--ink);
    border-color: var(--ink);
    box-shadow:
      0 0 0 2.5px var(--parch),
      0 0 0 4px var(--ink);
  }
</style>
