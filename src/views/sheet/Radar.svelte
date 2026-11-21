<script lang="ts">
  /** Маленький шестиугольник характеристик в шапке (украшение). */
  import { ABILITIES, type Ability } from '../../lib/model/types';
  import { t } from '../../lib/i18n';

  let { scores }: { scores: Record<Ability, number> } = $props();

  const R = 44;
  const ang = (i: number) => ((-90 + i * 60) * Math.PI) / 180;
  const pt = (i: number, r: number) => `${(Math.cos(ang(i)) * r).toFixed(1)},${(Math.sin(ang(i)) * r).toFixed(1)}`;
  const ring = (r: number) => ABILITIES.map((_, i) => pt(i, r)).join(' ');
  const shape = $derived(ABILITIES.map((a, i) => pt(i, (Math.min(Math.max(scores[a], 0), 20) / 20) * R)).join(' '));
</script>

<svg class="radar" width="124" height="114" viewBox="-62 -57 124 114" aria-hidden="true">
  <polygon class="grid" points={ring(R)} />
  <polygon class="grid" points={ring(R / 2)} />
  <polygon class="shape" points={shape} />
  {#each ABILITIES as a, i (a)}
    <text x={Math.cos(ang(i)) * (R + 10)} y={Math.sin(ang(i)) * (R + 8) + 3}>{t(`abilityShort.${a}`).toUpperCase()}</text>
  {/each}
</svg>

<style>
  .radar {
    flex-shrink: 0;
    overflow: visible;
  }
  .grid {
    fill: none;
    stroke: var(--line);
  }
  .shape {
    fill: color-mix(in srgb, var(--ember) 35%, transparent);
    stroke: var(--ember);
    stroke-width: 1.5;
    stroke-linejoin: round;
  }
  text {
    font-size: 9px;
    fill: var(--muted);
    font-family: var(--font-sans);
    text-anchor: middle;
    font-weight: 600;
  }
</style>
