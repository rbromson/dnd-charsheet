<script lang="ts">
  /** Сцена «вытянутая карта»: рубашка переворачивается, на лицевой стороне — текст карты. */
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import CardBack from './CardBack.svelte';
  import { t } from '../../lib/i18n';

  let { deck, text, n, onclose }: { deck: string; text: string; n: number; onclose: () => void } = $props();

  let flipped = $state(false);
  let ready = false;
  const long = $derived(text.length > 90);

  onMount(() => {
    const a = setTimeout(() => (flipped = true), 260);
    const b = setTimeout(() => (ready = true), 900);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onclose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      window.removeEventListener('keydown', onKey);
    };
  });

  function close() {
    if (ready) onclose();
  }
</script>

<button class="stage" transition:fade={{ duration: 160 }} aria-label={t('common.close')} onclick={close}>
  <span class="kicker sc">{t('gear.revealKicker', { deck, n })}</span>
  <span class="lift">
    <span class="flip" class:flipped>
      <span class="face back"><CardBack emblem={40} /></span>
      <span class="face front">
        <span class="txt serif" class:long>{text}</span>
      </span>
    </span>
  </span>
  <span class="hint">{t('gear.revealClose')}</span>
</button>

<style>
  .stage {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 22px;
    padding: 24px;
    background:
      radial-gradient(ellipse at 50% 45%, rgba(232, 116, 59, 0.16), transparent 60%),
      rgba(8, 5, 4, 0.94);
    cursor: pointer;
  }
  .lift {
    display: block;
    perspective: 1400px;
    animation: rise 0.35s ease-out;
  }
  .kicker,
  .hint {
    display: block;
  }
  .kicker {
    color: var(--muted);
    font-size: 15px;
    letter-spacing: 0.12em;
  }
  .flip {
    display: block;
    position: relative;
    width: min(72vw, 340px, 52vh);
    aspect-ratio: 5 / 7;
    transform-style: preserve-3d;
    transition: transform 0.75s cubic-bezier(0.3, 1.3, 0.5, 1);
  }
  .flip.flipped {
    transform: rotateY(180deg);
  }
  @keyframes rise {
    from {
      transform: translateY(40px) scale(0.9);
      opacity: 0;
    }
  }
  .face {
    position: absolute;
    inset: 0;
    border-radius: 18px;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    overflow: hidden;
  }
  .front {
    transform: rotateY(180deg);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px 24px;
    background: linear-gradient(180deg, var(--parch), var(--parch2));
    box-shadow:
      inset 0 0 0 1px var(--edge),
      inset 0 0 0 10px var(--parch),
      inset 0 0 0 11.5px var(--edge),
      inset 0 0 40px rgba(120, 80, 30, 0.25),
      0 0 60px var(--ember-glow);
    color: var(--ink);
  }
  .txt {
    font-size: 28px;
    font-weight: 700;
    line-height: 1.25;
    text-align: center;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 100%;
    overflow: auto;
  }
  .txt.long {
    font-size: 19px;
    font-weight: 500;
    line-height: 1.45;
  }
  .hint {
    color: var(--muted);
    font-size: 13px;
  }
</style>
