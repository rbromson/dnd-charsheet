<script lang="ts" module>
  /** Силуэты костей в viewBox 0..100: контур + линии граней. */
  const SHAPES: Record<string, { outline: string; facets: string; numY: number }> = {
    4: { outline: '50,6 95,88 5,88', facets: 'M50 6 L50 62 M50 62 L95 88 M50 62 L5 88', numY: 66 },
    6: { outline: '10,10 90,10 90,90 10,90', facets: 'M10 10 L22 22 M90 10 L78 22 M90 90 L78 78 M10 90 L22 78 M22 22 H78 V78 H22 Z', numY: 50 },
    8: { outline: '50,4 94,50 50,96 6,50', facets: 'M6 50 H94 M50 4 L50 96', numY: 50 },
    10: { outline: '50,4 94,42 50,96 6,42', facets: 'M6 42 L50 58 L94 42 M50 58 L50 96 M50 4 L28 49 M50 4 L72 49', numY: 52 },
    12: { outline: '50,4 95,37 78,92 22,92 5,37', facets: 'M50 22 L72 38 L64 68 L36 68 L28 38 Z M50 4 L50 22 M95 37 L72 38 M78 92 L64 68 M22 92 L36 68 M5 37 L28 38', numY: 50 },
    20: { outline: '50,3 95,27 95,73 50,97 5,73 5,27', facets: 'M50 20 L78 67 L22 67 Z M50 3 L50 20 M95 27 L78 67 M95 73 L78 67 M50 97 L78 67 M50 97 L22 67 M5 73 L22 67 M5 27 L22 67 M5 27 L50 20 M95 27 L50 20', numY: 52 },
  };
  export function shapeFor(sides: number) {
    if (sides === 100) return SHAPES[10];
    return SHAPES[sides] ?? null;
  }
</script>

<script lang="ts">
  let {
    sides,
    value,
    size = 92,
    tone = 'ember',
    spinning = false,
    struck = false,
    label = false,
    dir = 1,
  }: {
    sides: number;
    value: string | number;
    size?: number;
    tone?: 'ember' | 'gold' | 'bad' | 'dim' | 'plain';
    /** Кувыркается (анимация броска) */
    spinning?: boolean;
    /** Отброшенная кость (перевага/перешкода) */
    struck?: boolean;
    /** Подпись типа кости под числом (dN) */
    label?: boolean;
    /** Направление вращения, чтобы соседние кости кувыркались по-разному */
    dir?: 1 | -1;
  } = $props();

  const shape = $derived(shapeFor(sides));
  const text = $derived(String(value));
  const fs = $derived(Math.round(size * (text.length >= 3 ? 0.26 : sides === 4 ? 0.28 : 0.36)));
</script>

<div
  class="die tone-{tone}"
  class:spinning
  class:struck
  style:width="{size}px"
  style:height="{size}px"
  style:--dir={dir}
  aria-hidden="true"
>
  <svg viewBox="0 0 100 100">
    {#if shape}
      <polygon class="body" points={shape.outline} />
      <path class="facets" d={shape.facets} />
    {:else}
      <circle class="body" cx="50" cy="50" r="45" />
    {/if}
  </svg>
  <span class="n" style:font-size="{fs}px" style:top="{shape?.numY ?? 50}%">{text}</span>
  {#if label}<span class="t" style:font-size="{Math.max(9, Math.round(size * 0.14))}px">d{sides}</span>{/if}
</div>

<style>
  .die {
    position: relative;
    flex-shrink: 0;
    --c: var(--ember);
    --fill: var(--ember-soft);
    color: var(--parch);
    transition:
      opacity 0.25s,
      transform 0.25s;
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .body {
    fill: var(--fill);
    stroke: var(--c);
    stroke-width: 3;
    stroke-linejoin: round;
  }
  .facets {
    fill: none;
    stroke: var(--c);
    stroke-width: 1.4;
    stroke-linejoin: round;
    opacity: 0.45;
  }
  .n {
    position: absolute;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: var(--font-serif);
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .t {
    position: absolute;
    left: 0;
    right: 0;
    bottom: -2px;
    text-align: center;
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--muted);
    transform: translateY(100%);
  }
  .tone-gold {
    --c: var(--gold);
    --fill: rgba(230, 180, 80, 0.14);
    color: var(--gold);
  }
  .tone-bad {
    --c: var(--bad);
    --fill: rgba(192, 83, 63, 0.14);
    color: #e79a8a;
  }
  .tone-plain {
    --c: var(--line2);
    --fill: rgba(0, 0, 0, 0.15);
  }
  .tone-dim {
    --c: #7a6550;
    --fill: transparent;
    color: var(--muted);
  }
  .struck {
    opacity: 0.4;
    transform: scale(0.82);
  }
  .struck .n {
    text-decoration: line-through;
    text-decoration-thickness: 2px;
  }
  .spinning {
    animation: tumble 0.7s cubic-bezier(0.3, 0.6, 0.35, 1) both;
  }
  .spinning svg {
    animation: wobble 0.7s ease-out both;
  }
  .spinning .n {
    opacity: 0.75;
  }
  @keyframes tumble {
    0% {
      transform: translate3d(0, -14px, 0) rotate(calc(var(--dir) * -200deg)) scale(0.6);
    }
    45% {
      transform: translate3d(0, 6px, 0) rotate(calc(var(--dir) * 40deg)) scale(1.08);
    }
    70% {
      transform: translate3d(0, -3px, 0) rotate(calc(var(--dir) * -12deg)) scale(0.97);
    }
    100% {
      transform: none;
    }
  }
  @keyframes wobble {
    0%,
    100% {
      transform: none;
    }
    20% {
      transform: scale(1, 0.85);
    }
    40% {
      transform: scale(0.88, 1);
    }
    60% {
      transform: scale(1, 0.94);
    }
  }
</style>
