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
  const uid = $props.id();

  // приземление: после кувыркания — волна и пыль
  let landKey = $state(0);
  let wasSpinning = false;
  $effect(() => {
    if (wasSpinning && !spinning) landKey++;
    wasSpinning = spinning;
  });
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
  <span class="shadow"></span>
  <div class="inner">
    <svg viewBox="0 0 100 100">
      <defs>
        <radialGradient id="g{uid}" cx="35%" cy="28%" r="80%">
          <stop offset="0" style="stop-color: var(--hi)" />
          <stop offset="0.55" style="stop-color: var(--mid)" />
          <stop offset="1" style="stop-color: var(--lo)" />
        </radialGradient>
      </defs>
      {#if shape}
        <polygon class="body" points={shape.outline} fill="url(#g{uid})" />
        <path class="facets" d={shape.facets} />
        <polygon class="rim" points={shape.outline} />
      {:else}
        <circle class="body" cx="50" cy="50" r="45" fill="url(#g{uid})" />
      {/if}
    </svg>
    <span class="n" style:font-size="{fs}px" style:top="{shape?.numY ?? 50}%">{text}</span>
  </div>
  {#if label}<span class="t" style:font-size="{Math.max(9, Math.round(size * 0.14))}px">d{sides}</span>{/if}
  {#if landKey}
    {#key landKey}
      <span class="land">
        <span class="wave"></span>
        {#each [0, 1, 2, 3, 4, 5] as i (i)}<span class="dust" style:--a="{i * 60 + 15}deg"></span>{/each}
      </span>
    {/key}
  {/if}
</div>

<style>
  /* Кость: «самоцвет» с градиентом граней, тень на столе; бросок — 3D-кувырок с двумя отскоками */
  .die {
    position: relative;
    flex-shrink: 0;
    --c: #f08a50;
    --hi: #ffd2a6;
    --mid: #e8743b;
    --lo: #8f3a17;
    --ink: #2a1206;
    color: var(--ink);
    perspective: 420px;
    transition:
      opacity 0.25s,
      transform 0.25s;
  }
  .inner {
    position: absolute;
    inset: 0;
    transform-style: preserve-3d;
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.45));
  }
  .body {
    stroke: none;
  }
  .facets {
    fill: none;
    stroke: rgba(40, 14, 4, 0.55);
    stroke-width: 1.6;
    stroke-linejoin: round;
  }
  .rim {
    fill: none;
    stroke: var(--c);
    stroke-width: 2.6;
    stroke-linejoin: round;
  }
  .shadow {
    position: absolute;
    left: 14%;
    right: 14%;
    bottom: -9%;
    height: 14%;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(0, 0, 0, 0.55), transparent 70%);
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
    text-shadow: 0 1px 0 rgba(255, 230, 200, 0.45);
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
    --c: #ffd97a;
    --hi: #fff0c2;
    --mid: #e6b450;
    --lo: #8a6018;
    --ink: #2a1a04;
  }
  .tone-bad {
    --c: #e07a66;
    --hi: #f0a898;
    --mid: #c0533f;
    --lo: #5e1d12;
    --ink: #fff2ee;
  }
  .tone-bad .n {
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
  }
  .tone-plain {
    --c: #7a6550;
    --hi: #5a4636;
    --mid: #3a2c22;
    --lo: #1d1612;
    --ink: var(--parch);
  }
  .tone-dim {
    --c: #6b5a48;
    --hi: #4a3a2e;
    --mid: #2b211b;
    --lo: #17110e;
    --ink: var(--muted);
  }
  .tone-plain .n,
  .tone-dim .n {
    text-shadow: none;
  }
  .struck {
    opacity: 0.45;
    transform: scale(0.82);
  }
  .struck .n {
    text-decoration: line-through;
    text-decoration-thickness: 2px;
  }

  .spinning .inner {
    animation: tumble 0.72s cubic-bezier(0.3, 0.55, 0.3, 1) both;
  }
  .spinning svg {
    animation: squash 0.72s linear both;
  }
  .spinning .shadow {
    animation: shadow 0.72s cubic-bezier(0.3, 0.55, 0.3, 1) both;
  }
  .spinning .n {
    opacity: 0.8;
  }
  @keyframes tumble {
    0% {
      transform: translateY(-70%) rotateX(calc(var(--dir) * 320deg)) rotateY(calc(var(--dir) * 140deg)) rotateZ(calc(var(--dir) * -160deg)) scale(0.7);
    }
    38% {
      transform: translateY(4%) rotateX(calc(var(--dir) * 40deg)) rotateY(calc(var(--dir) * 20deg)) rotateZ(calc(var(--dir) * 24deg)) scale(1.04);
    }
    56% {
      transform: translateY(-16%) rotateX(calc(var(--dir) * -14deg)) rotateY(0) rotateZ(calc(var(--dir) * -10deg)) scale(1);
    }
    74% {
      transform: translateY(2%) rotateX(4deg) rotateZ(calc(var(--dir) * 4deg));
    }
    86% {
      transform: translateY(-4%) rotateZ(calc(var(--dir) * -2deg));
    }
    100% {
      transform: none;
    }
  }
  /* приплющивание в момент ударов */
  @keyframes squash {
    0%,
    34%,
    44%,
    70%,
    78%,
    100% {
      transform: none;
    }
    38% {
      transform: scale(1.12, 0.86);
    }
    74% {
      transform: scale(1.05, 0.95);
    }
  }
  @keyframes shadow {
    0% {
      transform: scale(0.4);
      opacity: 0.3;
    }
    38% {
      transform: scale(1.1);
      opacity: 1;
    }
    56% {
      transform: scale(0.75);
      opacity: 0.6;
    }
    74%,
    100% {
      transform: none;
      opacity: 1;
    }
  }

  /* приземление: волна и пыль */
  .land {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .wave {
    position: absolute;
    left: 50%;
    bottom: -6%;
    width: 110%;
    height: 26%;
    margin-left: -55%;
    border-radius: 50%;
    border: 2px solid var(--c);
    opacity: 0;
    animation: wave 0.55s ease-out;
  }
  @keyframes wave {
    0% {
      opacity: 0.8;
      transform: scale(0.5);
    }
    100% {
      opacity: 0;
      transform: scale(1.5);
    }
  }
  .dust {
    position: absolute;
    left: 50%;
    top: 92%;
    width: 6px;
    height: 6px;
    margin: -3px;
    border-radius: 50%;
    background: var(--hi);
    opacity: 0;
    animation: dust 0.6s ease-out;
  }
  @keyframes dust {
    0% {
      opacity: 0.9;
      transform: rotate(var(--a)) translateX(0) scale(1);
    }
    100% {
      opacity: 0;
      transform: rotate(var(--a)) translateX(calc(var(--size, 60px) * 0.55)) scale(0.3);
    }
  }
  .dust {
    --size: 90px;
  }
  @media (prefers-reduced-motion: reduce) {
    .spinning .inner,
    .spinning svg,
    .spinning .shadow,
    .wave,
    .dust {
      animation: none !important;
    }
  }
</style>
