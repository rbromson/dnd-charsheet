<script lang="ts">
  /** Металлическая монета с подписью (ММ/СМ/ЕМ/ЗМ/ПМ). */
  import type { CoinKey } from './coins';
  import { t } from '../../lib/i18n';
  let { coin, size = 56 }: { coin: CoinKey; size?: number } = $props();
</script>

<span class="disc {coin}" style:width="{size}px" style:height="{size}px" style:font-size="{Math.round(size * 0.3)}px">
  <span class="sc">{t(`gear.coin.${coin}`)}</span>
</span>

<style>
  /* Локальные «металлы»: тёплые, приглушённые, под тему пергамента */
  .disc {
    --metal-hi: #f3e7c9;
    --metal: #c9b38a;
    --metal-lo: #6b5a48;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    flex-shrink: 0;
    color: var(--ink);
    font-weight: 700;
    letter-spacing: 0.02em;
    background:
      radial-gradient(circle at 34% 28%, var(--metal-hi), var(--metal) 52%, var(--metal-lo) 100%);
    box-shadow:
      inset 0 0 0 3px rgba(255, 255, 255, 0.18),
      inset 0 0 0 5px rgba(42, 31, 23, 0.18),
      inset 0 -4px 8px rgba(42, 31, 23, 0.3),
      0 2px 6px rgba(0, 0, 0, 0.35);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
  }
  .cp {
    --metal-hi: #f0b48a;
    --metal: #b8693a;
    --metal-lo: #6e3618;
    color: #2a1208;
  }
  .sp {
    --metal-hi: #f6f4ee;
    --metal: #b9b7b0;
    --metal-lo: #6d6b66;
  }
  .ep {
    --metal-hi: #f4ecb8;
    --metal: #c4b264;
    --metal-lo: #6f6330;
  }
  .gp {
    --metal-hi: #ffe7a0;
    --metal: #e6b450;
    --metal-lo: #8a6418;
  }
  .pp {
    --metal-hi: #f7fafb;
    --metal: #c8d1d4;
    --metal-lo: #7a878c;
  }
</style>
