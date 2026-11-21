<script lang="ts">
  /** Рубашка карты: заполняет родителя. */
  import Icon from '../../components/Icon.svelte';
  let { emblem = 32 }: { emblem?: number } = $props();
</script>

<span class="back">
  <span class="frame"></span>
  <span class="emb"><Icon name="sparkle" size={emblem} stroke={1.4} /></span>
</span>

<style>
  .back {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ember);
    background:
      repeating-linear-gradient(45deg, rgba(232, 116, 59, 0.16) 0 1.5px, transparent 1.5px 12px),
      repeating-linear-gradient(-45deg, rgba(232, 116, 59, 0.16) 0 1.5px, transparent 1.5px 12px),
      radial-gradient(circle at 50% 45%, var(--bg3), var(--rail) 75%);
    box-shadow: inset 0 0 0 1px var(--line2);
  }
  .frame {
    position: absolute;
    inset: 8%;
    border-radius: 8px;
    border: 1.5px solid rgba(232, 116, 59, 0.55);
  }
  .emb {
    position: relative;
    display: flex;
    width: 2.2em;
    height: 2.2em;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--rail);
    box-shadow: 0 0 0 1.5px rgba(232, 116, 59, 0.55), 0 0 18px var(--ember-glow);
    font-size: 26px;
  }
</style>
