<script lang="ts" module>
  import { SUPPORTED, type DieSpec } from '../../lib/dice3d/spec';
  /** Можно ли показать эти кости в 3D (иначе — плоские DieShape). */
  export function can3d(specs: { sides: number }[]): boolean {
    return specs.length > 0 && specs.length <= 6 && specs.every((s) => SUPPORTED.has(s.sides)) && hasWebgl();
  }
  let webgl: boolean | null = null;
  function hasWebgl() {
    if (webgl === null) {
      try {
        const c = document.createElement('canvas');
        webgl = !!(c.getContext('webgl2') || c.getContext('webgl'));
      } catch {
        webgl = false;
      }
    }
    return webgl;
  }
  export type { DieSpec };
</script>

<script lang="ts">
  /**
   * Холст с 3D-костями. mode: roll — бросок (перезапуск по rollKey), show — сразу итог, idle — медленное вращение.
   * three.js грузится лениво при первом показе.
   */
  import { onMount, untrack } from 'svelte';
  import type { DiceScene } from '../../lib/dice3d/scene';

  let {
    specs,
    mode = 'roll',
    rollKey = 0,
    height = 170,
    onlanded,
  }: { specs: DieSpec[]; mode?: 'roll' | 'show' | 'idle'; rollKey?: number; height?: number; onlanded?: () => void } = $props();

  let canvas: HTMLCanvasElement | undefined = $state();
  let scene: DiceScene | null = $state(null);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  onMount(() => {
    let alive = true;
    import('../../lib/dice3d/scene').then(({ DiceScene }) => {
      if (!alive || !canvas) return;
      scene = new DiceScene(canvas);
      scene.onLanded = () => onlanded?.();
    });
    return () => {
      alive = false;
      scene?.dispose();
    };
  });

  // бросок / показ / вращение — по rollKey и режиму
  $effect(() => {
    const s = scene;
    void rollKey;
    const m = mode;
    if (!s) return;
    untrack(() => {
      const list = $state.snapshot(specs) as DieSpec[];
      if (m === 'idle') s.idle(list[0]?.sides ?? 20, list[0]?.value ?? 20, list[0]?.tone ?? 'ember');
      else if (m === 'show' || reduced) {
        s.show(list);
        if (m === 'roll') onlanded?.();
      } else s.roll(list);
    });
  });

  // крит/провал/отброшенная кость меняют окраску без нового броска
  $effect(() => {
    const list = $state.snapshot(specs) as DieSpec[];
    untrack(() => scene?.restyle(list));
  });
</script>

<canvas bind:this={canvas} class="d3" style:height="{height}px" aria-hidden="true"></canvas>

<style>
  .d3 {
    display: block;
    width: 100%;
    touch-action: none;
  }
</style>
