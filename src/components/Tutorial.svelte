<script lang="ts" module>
  const LS_KEY = 'taverna.tutorialSeen';
  export function tutorialSeen(): boolean {
    try {
      return localStorage.getItem(LS_KEY) === '1';
    } catch {
      return true;
    }
  }
  function markSeen() {
    try {
      localStorage.setItem(LS_KEY, '1');
    } catch {
      /* приватный режим — покажется ещё раз, не страшно */
    }
  }
</script>

<script lang="ts">
  /**
   * Обучение: 8 карточек с анимированными сценами (чистый CSS, без картинок — работает офлайн).
   * Первый запуск — открывается само; повтор — «Як користуватися» в панели персонажей и на стартовом экране.
   */
  import Icon from './Icon.svelte';
  import DieShape from '../views/dice/DieShape.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n';
  import { shareOrCopy } from '../lib/session/share';

  async function ask() {
    const q = `${t('tut.askIntro')}\n\n${t(`tut.${step + 1}.ask`)}`;
    const r = await shareOrCopy(q, t(`tut.${step + 1}.title`));
    if (r === 'copied') ui.toast(t('tut.askCopied'), undefined, 5000);
  }
  import { fade, fly } from 'svelte/transition';

  const TOTAL = 8;
  let step = $state(0);
  let dir = $state(1);

  function close() {
    markSeen();
    ui.tutorialOpen = false;
    step = 0;
  }
  function go(n: number) {
    if (n < 0 || n >= TOTAL) return;
    dir = n > step ? 1 : -1;
    step = n;
  }
  const next = () => (step === TOTAL - 1 ? close() : go(step + 1));
  const back = () => go(step - 1);

  function onKey(e: KeyboardEvent) {
    if (!ui.tutorialOpen) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') back();
  }

  // свайп по карточке
  let sx = 0;
  let sy = 0;
  const down = (e: PointerEvent) => {
    sx = e.clientX;
    sy = e.clientY;
  };
  const up = (e: PointerEvent) => {
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - sy) * 1.5) (dx < 0 ? next : back)();
  };

  const n = $derived(step + 1);
</script>

<svelte:window onkeydown={onKey} />

{#if ui.tutorialOpen}
  <div class="layer" transition:fade={{ duration: 160 }}>
    <div class="box" role="dialog" tabindex="-1" aria-modal="true" aria-label={t(`tut.${n}.title`)} onpointerdown={down} onpointerup={up}>
      <div class="top">
        <span class="count">{t('tut.step', { n, total: TOTAL })}</span>
        <button class="skip" onclick={close}>{t('tut.skip')}</button>
      </div>

      {#key step}
        <div class="slide" in:fly={{ x: 40 * dir, duration: 260 }}>
          <div class="stage s{n}" aria-hidden="true">
            {#if n === 1}
              <div class="glow"></div>
              <div class="die1"><DieShape sides={20} value="20" size={92} tone="ember" /></div>
              <div class="stack1">
                <span class="mb pri b1"><Icon name="plus" size={14} />{t('chars.new')}</span>
                <span class="mb b2"><Icon name="upload" size={14} />{t('chars.import')}</span>
                <span class="mb b3"><Icon name="download" size={14} />{t('tpl.button')}</span>
              </div>
            {:else if n === 2}
              <div class="seg2"><span class="sg">{t('mode.play')}</span><span class="sg">{t('mode.edit')}</span><span class="thumb"></span></div>
              <div class="row2 mcard"><span class="dot"></span>{t('skill.deception')}<b>+5</b></div>
              <div class="rolled2"><Icon name="dice" size={14} />17</div>
              <div class="sheet2 mcard"><span class="ln w60"></span><span class="ln w80"></span><span class="ln w40"></span></div>
              <div class="finger f2"><span class="ripple"></span><span class="ring"></span></div>
            {:else if n === 3}
              <div class="tile3"><Icon name="dice" size={14} />{t('skill.deception')} <b>+5</b></div>
              <div class="prompt3">
                <div class="chips3">
                  <span class="ch">{t('roll.dis')}</span><span class="ch">{t('roll.normal')}</span><span class="ch adv">{t('roll.adv')}</span>
                </div>
                <div class="d3"><DieShape sides={20} value="20" size={64} tone="ember" /></div>
                <div class="res3">22</div>
              </div>
              <div class="finger f3"><span class="ripple"></span></div>
            {:else if n === 4}
              <div class="hp4 mcard">
                <div class="hpn"><span class="a">35</span><span class="b">28</span><small>/ 43</small></div>
                <div class="bar"><span></span></div>
              </div>
              <div class="pad4">
                {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as k (k)}<span class="key" class:k7={k === '7'}>{k}</span>{/each}
              </div>
              <div class="disp4">7</div>
              <span class="dmg4">{t('combat.damage')}</span>
              <div class="finger f4"><span class="ripple"></span></div>
            {:else if n === 5}
              <div class="lib5 mcard">
                <div class="hd"><Icon name="search" size={12} />{t('lib.open')}</div>
                <div class="li">{t('tut.s5.sword')}<b>1к8</b></div>
                <div class="li hl">{t('tut.s5.ring')}<b>КО +1</b></div>
                <div class="li">{t('tut.s5.potion')}</div>
              </div>
              <div class="fly5 mcard">{t('tut.s5.ring')}</div>
              <div class="gear5 mcard">
                <div class="hd"><Icon name="gear" size={12} />{t('nav.gear')}</div>
                <div class="gi">{t('tut.s5.sword')}</div>
                <div class="gi new">{t('tut.s5.ring')}<span class="att">{t('gear.attunedShort')}</span></div>
              </div>
              <div class="ac5"><Icon name="shield" size={14} /><span class="a">14</span><span class="b">15</span></div>
            {:else if n === 6}
              <div class="fab6"><Icon name="feather" size={20} stroke={2} /></div>
              <div class="note6 mcard">
                <div class="hd"><Icon name="feather" size={12} />{t('journal.quick.title')}</div>
                <div class="txt"><span class="type">{t('tut.s6.text')}</span><span class="men">@{t('tut.s6.npc')}</span></div>
                <div class="mic"><Icon name="mic" size={14} /><span class="w"></span><span class="w"></span></div>
              </div>
              <div class="finger f6"><span class="ripple"></span></div>
            {:else if n === 7}
              <div class="n7 mcard"><Icon name="feather" size={12} /><span class="ln w80"></span><span class="ln w60"></span><span class="ln w70"></span></div>
              <div class="arrow7"><span></span><span></span><span></span></div>
              <div class="ai7"><Icon name="sparkle" size={18} /><span class="code">{'{ … }'}</span></div>
              <div class="list7 mcard">
                <div class="ck c1"><span class="cb"></span><Icon name="gear" size={12} />+2 {t('tut.s5.potion')}</div>
                <div class="ck c2"><span class="cb"></span><Icon name="star" size={12} />+15 {t('gear.coin.gp')}</div>
                <div class="ck c3"><span class="cb"></span><Icon name="users" size={12} />{t('tut.s6.npc')}</div>
              </div>
            {:else}
              <div class="dev8 tab"><Icon name="lock" size={20} /><span class="lbl">{t('tut.s8.tablet')}</span></div>
              <div class="dev8 ph"><Icon name="lock" size={16} /><span class="lbl">{t('tut.s8.phone')}</span></div>
              <div class="zip8"><Icon name="download" size={14} />.zip</div>
              <div class="lang8"><span>UA</span><span>EN</span><i></i></div>
            {/if}
          </div>

          <h2 class="sc">{t(`tut.${n}.title`)}</h2>
          <ul>
            <li>{t(`tut.${n}.p1`)}</li>
            <li>{t(`tut.${n}.p2`)}</li>
            <li>{t(`tut.${n}.p3`)}</li>
          </ul>
          <button class="ask" onclick={ask}><Icon name="sparkle" size={16} />{t('tut.ask')}<Icon name="copy" size={15} /></button>
        </div>
      {/key}

      <div class="dots">
        {#each Array(TOTAL) as _, i (i)}
          <button class="d" class:on={i === step} aria-label={t('tut.step', { n: i + 1, total: TOTAL })} onclick={() => go(i)}></button>
        {/each}
      </div>
      <div class="acts">
        <button class="btn btn-outline" disabled={step === 0} onclick={back}><Icon name="back" size={18} />{t('tut.back')}</button>
        <button class="btn btn-primary grow" onclick={next}>{step === TOTAL - 1 ? t('tut.done') : t('tut.next')}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .layer {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: radial-gradient(ellipse at 50% 40%, rgba(8, 5, 4, 0.6), rgba(8, 5, 4, 0.85));
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  .box {
    position: relative;
    width: min(480px, 100%);
    max-height: calc(100dvh - 32px);
    overflow-y: auto;
    padding: 16px 20px 18px;
    border-radius: 24px;
    color: var(--parch);
    background: var(--leather);
    background-size: var(--leather-size);
    box-shadow: var(--leather-shadow), 0 0 80px rgba(232, 116, 59, 0.18), var(--shadow-pop);
    touch-action: pan-y;
  }
  .box::after {
    content: '';
    position: absolute;
    inset: 7px;
    border-radius: 18px;
    border: 1.5px dashed var(--stitch);
    pointer-events: none;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .count {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--gold);
    opacity: 0.85;
  }
  .skip {
    min-height: 40px;
    padding: 0 8px;
    color: var(--muted);
    font-weight: 600;
    font-size: 14px;
  }
  h2 {
    font-size: 24px;
    margin: 14px 0 6px;
    text-shadow: 0 1px 0 rgba(0, 0, 0, 0.6);
  }
  ul {
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 15px;
    line-height: 1.45;
    color: #e6d6bb;
    min-height: 132px;
  }
  li::marker {
    color: var(--ember);
  }
  .ask {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    min-height: 40px;
    padding: 0 12px;
    border-radius: 20px;
    font-weight: 600;
    font-size: 13.5px;
    color: var(--gold);
    background: rgba(230, 180, 80, 0.08);
    box-shadow: inset 0 0 0 1px rgba(230, 180, 80, 0.35);
  }
  .ask:active {
    transform: scale(0.96);
  }
  .dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    margin: 14px 0 10px;
  }
  .d {
    width: 8px;
    height: 8px;
    border-radius: 4px;
    background: rgba(214, 170, 110, 0.3);
    transition:
      width 0.25s var(--ease),
      background 0.25s;
    padding: 0;
    min-height: 0;
  }
  .d.on {
    width: 22px;
    background: var(--ember);
  }
  .acts {
    display: flex;
    gap: 8px;
  }

  /* ===================== СЦЕНЫ ===================== */
  .stage {
    --T: 5s;
    position: relative;
    margin-top: 10px;
    aspect-ratio: 16 / 10;
    border-radius: 16px;
    overflow: hidden;
    background:
      radial-gradient(ellipse 80% 70% at 50% 30%, rgba(232, 116, 59, 0.16), transparent 70%),
      linear-gradient(180deg, #1c140f, #120c09);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.6), inset 0 2px 10px rgba(0, 0, 0, 0.6);
    font-size: 11px;
    color: var(--ink);
  }
  .stage * {
    animation-duration: var(--T);
    animation-iteration-count: infinite;
    animation-timing-function: var(--ease);
  }
  .mcard {
    position: absolute;
    border-radius: 10px;
    background: var(--paper);
    background-size: 180px 180px, 520px 520px, 100% 100%;
    box-shadow:
      inset 0 0 0 1px rgba(150, 112, 62, 0.55),
      0 6px 14px -6px rgba(0, 0, 0, 0.7);
    padding: 6px 8px;
  }
  .ln {
    display: block;
    height: 5px;
    border-radius: 3px;
    background: rgba(107, 90, 72, 0.35);
    margin: 4px 0;
  }
  .w40 {
    width: 40%;
  }
  .w60 {
    width: 60%;
  }
  .w70 {
    width: 70%;
  }
  .w80 {
    width: 80%;
  }
  .hd {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 700;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink2);
    margin-bottom: 4px;
  }
  /* палец: тёплый круг с волной нажатия */
  .finger {
    position: absolute;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, #fff4e0, #f1c79a);
    box-shadow:
      0 4px 10px rgba(0, 0, 0, 0.5),
      0 0 0 2px rgba(255, 255, 255, 0.25);
    z-index: 5;
  }
  .ripple {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 2px solid rgba(255, 220, 180, 0.9);
    opacity: 0;
  }
  @keyframes ripple {
    0%,
    100% {
      transform: scale(0.6);
      opacity: 0;
    }
  }

  /* 1 — приветствие */
  .glow {
    position: absolute;
    left: 50%;
    top: 46%;
    width: 160px;
    height: 160px;
    margin: -80px 0 0 -80px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 150, 80, 0.45), transparent 65%);
    animation-name: pulse1;
  }
  .die1 {
    position: absolute;
    left: 50%;
    top: 12%;
    margin-left: -46px;
    animation-name: bob1;
    filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.6));
  }
  @keyframes bob1 {
    0%,
    100% {
      transform: translateY(0) rotate(-6deg);
    }
    50% {
      transform: translateY(-8px) rotate(6deg);
    }
  }
  @keyframes pulse1 {
    0%,
    100% {
      opacity: 0.6;
      transform: scale(0.9);
    }
    50% {
      opacity: 1;
      transform: scale(1.08);
    }
  }
  .stack1 {
    position: absolute;
    left: 50%;
    bottom: 8%;
    transform: translateX(-50%);
    display: flex;
    gap: 6px;
  }
  .mb {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 8px;
    border-radius: 8px;
    font-weight: 600;
    white-space: nowrap;
    color: var(--parch);
    background: rgba(255, 220, 170, 0.06);
    box-shadow: inset 0 0 0 1px rgba(214, 170, 110, 0.4);
    animation-name: pop1;
  }
  .mb.pri {
    color: var(--ember-ink);
    background: var(--ember);
    box-shadow: 0 4px 12px -4px var(--ember-glow);
  }
  .b2 {
    animation-delay: 0.15s;
  }
  .b3 {
    animation-delay: 0.3s;
  }
  @keyframes pop1 {
    0%,
    8% {
      opacity: 0;
      transform: translateY(8px) scale(0.9);
    }
    18%,
    90% {
      opacity: 1;
      transform: none;
    }
    100% {
      opacity: 0;
    }
  }

  /* 2 — Гра / Правка, тап и долгое нажатие */
  .seg2 {
    position: absolute;
    top: 9%;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    padding: 3px;
    border-radius: 9px;
    background: rgba(0, 0, 0, 0.4);
    color: #f6e7cc;
    font-weight: 700;
  }
  .sg {
    position: relative;
    z-index: 1;
    width: 62px;
    text-align: center;
    padding: 4px 0;
  }
  .thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 62px;
    bottom: 3px;
    border-radius: 7px;
    background: var(--ember);
    box-shadow: 0 0 10px var(--ember-glow);
    animation-name: thumb2;
  }
  @keyframes thumb2 {
    0%,
    80% {
      transform: none;
    }
    86%,
    96% {
      transform: translateX(62px);
    }
  }
  .row2 {
    left: 12%;
    right: 34%;
    top: 40%;
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }
  .row2 b {
    margin-left: auto;
    font-family: var(--font-serif);
    font-size: 14px;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--ink);
  }
  .rolled2 {
    position: absolute;
    left: 40%;
    top: 22%;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px 7px;
    border-radius: 8px;
    background: var(--ember);
    color: var(--ember-ink);
    font-weight: 800;
    font-size: 13px;
    animation-name: rolled2;
  }
  @keyframes rolled2 {
    0%,
    18% {
      opacity: 0;
      transform: translateY(6px) scale(0.6);
    }
    24%,
    40% {
      opacity: 1;
      transform: none;
    }
    46%,
    100% {
      opacity: 0;
    }
  }
  .sheet2 {
    right: 4%;
    top: 30%;
    bottom: 8%;
    width: 30%;
    animation-name: sheet2;
  }
  @keyframes sheet2 {
    0%,
    62% {
      transform: translateX(130%);
    }
    70%,
    82% {
      transform: none;
    }
    90%,
    100% {
      transform: translateX(130%);
    }
  }
  .f2 {
    animation-name: f2;
  }
  .f2 .ripple {
    animation-name: rip2;
  }
  .ring {
    position: absolute;
    inset: -7px;
    border-radius: 50%;
    background: conic-gradient(var(--ember) 0deg, transparent 0deg);
    mask: radial-gradient(circle, transparent 58%, #000 60%);
    -webkit-mask: radial-gradient(circle, transparent 58%, #000 60%);
    animation-name: ring2;
  }
  @keyframes f2 {
    0% {
      left: 70%;
      top: 80%;
    }
    14%,
    30% {
      left: 32%;
      top: 44%;
    }
    40%,
    66% {
      left: 44%;
      top: 44%;
    }
    80%,
    100% {
      left: 62%;
      top: 12%;
    }
  }
  @keyframes rip2 {
    0%,
    15% {
      opacity: 0;
      transform: scale(0.6);
    }
    18% {
      opacity: 1;
      transform: scale(1);
    }
    26%,
    100% {
      opacity: 0;
      transform: scale(1.8);
    }
  }
  @keyframes ring2 {
    0%,
    42% {
      background: conic-gradient(var(--ember) 0deg, transparent 0deg);
      opacity: 0;
    }
    44% {
      opacity: 1;
    }
    64% {
      background: conic-gradient(var(--ember) 360deg, transparent 360deg);
      opacity: 1;
    }
    68%,
    100% {
      opacity: 0;
    }
  }

  /* 3 — бросок с выбором режима */
  .tile3 {
    position: absolute;
    left: 8%;
    top: 12%;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 9px;
    border-radius: 10px;
    color: var(--parch);
    font-weight: 600;
    background: var(--leather);
    background-size: var(--leather-size);
    box-shadow: var(--leather-shadow), inset 0 -2px 0 -1px var(--ember);
  }
  .tile3 b {
    font-family: var(--font-serif);
    font-size: 14px;
  }
  .prompt3 {
    position: absolute;
    left: 30%;
    right: 6%;
    top: 30%;
    bottom: 6%;
    border-radius: 12px;
    background: var(--leather);
    background-size: var(--leather-size);
    box-shadow: var(--leather-shadow), 0 0 24px rgba(232, 116, 59, 0.25);
    animation-name: prompt3;
  }
  @keyframes prompt3 {
    0%,
    12% {
      opacity: 0;
      transform: translateY(10px) scale(0.92);
    }
    18%,
    94% {
      opacity: 1;
      transform: none;
    }
    100% {
      opacity: 0;
    }
  }
  .chips3 {
    display: flex;
    justify-content: center;
    gap: 3px;
    margin: 6px 6px 0;
    padding: 2px;
    border-radius: 7px;
    background: rgba(0, 0, 0, 0.35);
  }
  .ch {
    flex: 1;
    text-align: center;
    padding: 3px 0;
    border-radius: 5px;
    font-size: 9.5px;
    font-weight: 700;
    color: #b9a487;
  }
  .ch.adv {
    animation-name: adv3;
  }
  @keyframes adv3 {
    0%,
    30% {
      background: transparent;
      color: #b9a487;
    }
    34%,
    100% {
      background: #f1e3c6;
      color: #7a5a10;
    }
  }
  .d3 {
    display: flex;
    justify-content: center;
    margin-top: 6px;
    animation-name: spin3;
    animation-timing-function: cubic-bezier(0.3, 0.8, 0.3, 1);
  }
  @keyframes spin3 {
    0%,
    48% {
      transform: none;
      opacity: 1;
    }
    68% {
      transform: rotate(720deg) scale(0.9);
      opacity: 1;
    }
    72%,
    100% {
      transform: rotate(720deg) scale(0.4);
      opacity: 0;
    }
  }
  .res3 {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 14%;
    text-align: center;
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 34px;
    color: var(--gold);
    text-shadow: 0 0 18px var(--gold-glow);
    animation-name: res3;
  }
  @keyframes res3 {
    0%,
    70% {
      opacity: 0;
      transform: scale(0.4);
    }
    76% {
      opacity: 1;
      transform: scale(1.2);
    }
    80%,
    94% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
    }
  }
  .f3 {
    animation-name: f3;
  }
  .f3 .ripple {
    animation-name: rip3;
  }
  @keyframes f3 {
    0% {
      left: 40%;
      top: 80%;
    }
    8%,
    14% {
      left: 20%;
      top: 14%;
    }
    26%,
    34% {
      left: 82%;
      top: 34%;
    }
    44%,
    54% {
      left: 58%;
      top: 54%;
    }
    70%,
    100% {
      left: 90%;
      top: 90%;
    }
  }
  @keyframes rip3 {
    0%,
    9% {
      opacity: 0;
      transform: scale(0.6);
    }
    11% {
      opacity: 1;
      transform: scale(1);
    }
    16%,
    28% {
      opacity: 0;
      transform: scale(1.8);
    }
    30% {
      opacity: 1;
      transform: scale(1);
    }
    36%,
    46% {
      opacity: 0;
      transform: scale(1.8);
    }
    48% {
      opacity: 1;
      transform: scale(1);
    }
    56%,
    100% {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  /* 4 — урон с клавиатуры */
  .hp4 {
    left: 6%;
    top: 10%;
    width: 40%;
  }
  .hpn {
    position: relative;
    height: 30px;
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 26px;
    line-height: 30px;
  }
  .hpn span {
    position: absolute;
    left: 0;
  }
  .hpn small {
    position: absolute;
    left: 38px;
    font-size: 13px;
    color: var(--ink2);
  }
  .hpn .a {
    animation-name: hpA;
  }
  .hpn .b {
    animation-name: hpB;
    color: #9b3a28;
  }
  @keyframes hpA {
    0%,
    66% {
      opacity: 1;
    }
    70%,
    96% {
      opacity: 0;
    }
  }
  @keyframes hpB {
    0%,
    66% {
      opacity: 0;
    }
    70%,
    96% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  .bar {
    height: 6px;
    border-radius: 3px;
    background: rgba(42, 31, 23, 0.15);
    overflow: hidden;
    margin-top: 4px;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--good);
    animation-name: bar4;
  }
  @keyframes bar4 {
    0%,
    66% {
      width: 81%;
    }
    74%,
    96% {
      width: 65%;
    }
    100% {
      width: 81%;
    }
  }
  .pad4 {
    position: absolute;
    right: 6%;
    top: 10%;
    width: 42%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }
  .key {
    text-align: center;
    padding: 4px 0;
    border-radius: 6px;
    background: #f5ecda;
    box-shadow: inset 0 0 0 1px var(--edge);
    font-weight: 700;
  }
  .k7 {
    animation-name: k7;
  }
  @keyframes k7 {
    0%,
    20% {
      background: #f5ecda;
    }
    22%,
    28% {
      background: var(--edge);
      transform: scale(0.92);
    }
    32%,
    100% {
      background: #f5ecda;
      transform: none;
    }
  }
  .disp4 {
    position: absolute;
    left: 6%;
    top: 52%;
    width: 40%;
    text-align: center;
    padding: 4px 0;
    border-radius: 8px;
    font-weight: 800;
    font-size: 20px;
    color: var(--parch);
    background: rgba(0, 0, 0, 0.35);
    animation-name: disp4;
  }
  @keyframes disp4 {
    0%,
    24% {
      color: rgba(234, 220, 192, 0.2);
    }
    28%,
    64% {
      color: var(--parch);
    }
    70%,
    100% {
      color: rgba(234, 220, 192, 0.2);
    }
  }
  .dmg4 {
    position: absolute;
    left: 6%;
    bottom: 8%;
    width: 40%;
    text-align: center;
    padding: 6px 0;
    border-radius: 8px;
    font-weight: 700;
    color: #fff;
    background: var(--bad);
    animation-name: dmg4;
  }
  @keyframes dmg4 {
    0%,
    54% {
      transform: none;
    }
    58%,
    62% {
      transform: scale(0.92);
      filter: brightness(1.2);
    }
    66%,
    100% {
      transform: none;
    }
  }
  .f4 {
    animation-name: f4;
  }
  .f4 .ripple {
    animation-name: rip4;
  }
  @keyframes f4 {
    0% {
      left: 80%;
      top: 92%;
    }
    18%,
    30% {
      left: 64%;
      top: 44%;
    }
    50%,
    64% {
      left: 22%;
      top: 82%;
    }
    80%,
    100% {
      left: 50%;
      top: 96%;
    }
  }
  @keyframes rip4 {
    0%,
    20% {
      opacity: 0;
      transform: scale(0.6);
    }
    22% {
      opacity: 1;
      transform: scale(1);
    }
    30%,
    55% {
      opacity: 0;
      transform: scale(1.8);
    }
    58% {
      opacity: 1;
      transform: scale(1);
    }
    66%,
    100% {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  /* 5 — библиотека → снаряжение, налаштування */
  .lib5 {
    left: 5%;
    top: 8%;
    width: 46%;
  }
  .li,
  .gi {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    padding: 3px 0;
    border-bottom: 1px solid rgba(107, 90, 72, 0.2);
    font-family: var(--font-serif);
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
  }
  .li b {
    font-family: var(--font-sans);
    font-weight: 700;
    color: var(--ink2);
    font-size: 9.5px;
  }
  .li.hl {
    animation-name: hl5;
    border-radius: 4px;
  }
  @keyframes hl5 {
    0%,
    14% {
      background: transparent;
    }
    18%,
    30% {
      background: rgba(232, 116, 59, 0.22);
    }
    34%,
    100% {
      background: transparent;
    }
  }
  .fly5 {
    left: 8%;
    top: 34%;
    font-family: var(--font-serif);
    font-weight: 700;
    padding: 3px 7px;
    animation-name: fly5;
    z-index: 3;
  }
  @keyframes fly5 {
    0%,
    24% {
      opacity: 0;
      transform: none;
    }
    28% {
      opacity: 1;
      transform: none;
    }
    46% {
      opacity: 1;
      transform: translate(150px, 34px) scale(0.95);
    }
    50%,
    100% {
      opacity: 0;
      transform: translate(150px, 34px);
    }
  }
  .gear5 {
    right: 5%;
    top: 30%;
    width: 42%;
  }
  .gi.new {
    animation-name: new5;
    align-items: center;
  }
  @keyframes new5 {
    0%,
    46% {
      opacity: 0;
      max-height: 0;
      padding: 0;
    }
    50%,
    96% {
      opacity: 1;
      max-height: 30px;
      padding: 3px 0;
    }
    100% {
      opacity: 0;
    }
  }
  .att {
    font-family: var(--font-sans);
    font-size: 8.5px;
    padding: 1px 4px;
    border-radius: 4px;
    border: 1px solid var(--edge);
    color: var(--ink2);
    animation-name: att5;
  }
  @keyframes att5 {
    0%,
    62% {
      background: transparent;
      color: var(--ink2);
    }
    66%,
    100% {
      background: var(--ink);
      color: var(--parch);
      border-color: var(--ink);
    }
  }
  .ac5 {
    position: absolute;
    right: 8%;
    bottom: 10%;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 9px;
    border-radius: 9px;
    color: var(--parch);
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 16px;
    background: var(--leather);
    background-size: var(--leather-size);
    box-shadow: var(--leather-shadow), inset 0 -2px 0 -1px #e0703f;
  }
  .ac5 span {
    display: inline-block;
    width: 18px;
  }
  .ac5 .a {
    animation-name: ac5a;
  }
  .ac5 .b {
    position: absolute;
    right: 9px;
    color: var(--gold);
    animation-name: ac5b;
  }
  @keyframes ac5a {
    0%,
    66% {
      opacity: 1;
    }
    70%,
    96% {
      opacity: 0;
    }
  }
  @keyframes ac5b {
    0%,
    66% {
      opacity: 0;
      transform: scale(0.6);
    }
    72%,
    96% {
      opacity: 1;
      transform: scale(1);
    }
    100% {
      opacity: 0;
    }
  }

  /* 6 — быстрая заметка голосом */
  .fab6 {
    position: absolute;
    left: 6%;
    bottom: 10%;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ember-ink);
    background: linear-gradient(160deg, #f39a62, var(--ember) 50%, #c9562a);
    box-shadow: 0 0 18px var(--ember-glow);
    animation-name: fab6;
  }
  @keyframes fab6 {
    0%,
    10% {
      transform: none;
    }
    13% {
      transform: scale(0.88);
    }
    18%,
    100% {
      transform: none;
    }
  }
  .note6 {
    left: 26%;
    right: 5%;
    bottom: 8%;
    top: 16%;
    animation-name: note6;
  }
  @keyframes note6 {
    0%,
    14% {
      transform: translateY(120%);
    }
    22%,
    92% {
      transform: none;
    }
    100% {
      transform: translateY(120%);
    }
  }
  .txt {
    font-size: 11.5px;
    line-height: 1.5;
  }
  .type {
    display: inline-block;
    vertical-align: bottom;
    overflow: hidden;
    white-space: nowrap;
    max-width: 0;
    animation-name: type6;
    animation-timing-function: steps(24);
  }
  @keyframes type6 {
    0%,
    30% {
      max-width: 0;
    }
    64%,
    100% {
      max-width: 160px;
    }
  }
  .men {
    margin-left: 4px;
    padding: 1px 5px;
    border-radius: 5px;
    font-weight: 700;
    color: #7a2e45;
    background: rgba(143, 58, 83, 0.16);
    animation-name: men6;
  }
  @keyframes men6 {
    0%,
    66% {
      opacity: 0;
    }
    72%,
    100% {
      opacity: 1;
    }
  }
  .mic {
    position: absolute;
    right: 10px;
    bottom: 8px;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 4px 8px;
    border-radius: 14px;
    color: #fff;
    background: var(--bad);
    animation-name: mic6;
  }
  @keyframes mic6 {
    0%,
    26% {
      box-shadow: none;
    }
    30%,
    64% {
      box-shadow: 0 0 0 4px rgba(192, 83, 63, 0.3);
    }
    46% {
      box-shadow: 0 0 0 8px rgba(192, 83, 63, 0.15);
    }
    68%,
    100% {
      box-shadow: none;
    }
  }
  .w {
    width: 3px;
    height: 10px;
    border-radius: 2px;
    background: #fff;
    animation-name: wave6;
    animation-duration: 0.6s !important;
  }
  .w + .w {
    animation-delay: 0.2s;
  }
  @keyframes wave6 {
    0%,
    100% {
      transform: scaleY(0.4);
    }
    50% {
      transform: scaleY(1);
    }
  }
  .f6 {
    animation-name: f6;
  }
  .f6 .ripple {
    animation-name: rip6;
  }
  @keyframes f6 {
    0% {
      left: 40%;
      top: 96%;
    }
    10%,
    14% {
      left: 11%;
      top: 78%;
    }
    26%,
    100% {
      left: 86%;
      top: 82%;
    }
  }
  @keyframes rip6 {
    0%,
    10% {
      opacity: 0;
      transform: scale(0.6);
    }
    12% {
      opacity: 1;
      transform: scale(1);
    }
    18%,
    26% {
      opacity: 0;
      transform: scale(1.8);
    }
    28% {
      opacity: 1;
      transform: scale(1);
    }
    34%,
    100% {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  /* 7 — заметка → ИИ → список изменений */
  .n7 {
    left: 5%;
    top: 14%;
    width: 26%;
    color: var(--ink2);
  }
  .arrow7 {
    position: absolute;
    left: 33%;
    top: 26%;
    display: flex;
    gap: 5px;
  }
  .arrow7 span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ember);
    animation-name: dot7;
  }
  .arrow7 span:nth-child(2) {
    animation-delay: 0.15s;
  }
  .arrow7 span:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes dot7 {
    0%,
    6% {
      opacity: 0.15;
    }
    12%,
    26% {
      opacity: 1;
    }
    32%,
    100% {
      opacity: 0.15;
    }
  }
  .ai7 {
    position: absolute;
    left: 45%;
    top: 12%;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--gold);
    background: radial-gradient(circle at 40% 35%, #3a2a20, #1d140f);
    box-shadow: 0 0 0 1.5px rgba(214, 170, 110, 0.5), 0 0 22px rgba(230, 180, 80, 0.35);
    animation-name: ai7;
  }
  .code {
    font-family: monospace;
    font-size: 9px;
    color: #e6d6bb;
  }
  @keyframes ai7 {
    0%,
    20% {
      transform: scale(0.9);
    }
    28% {
      transform: scale(1.08) rotate(8deg);
    }
    34%,
    100% {
      transform: none;
    }
  }
  .list7 {
    left: 26%;
    right: 5%;
    bottom: 7%;
    animation-name: list7;
  }
  @keyframes list7 {
    0%,
    32% {
      opacity: 0;
      transform: translateY(14px);
    }
    38%,
    94% {
      opacity: 1;
      transform: none;
    }
    100% {
      opacity: 0;
    }
  }
  .ck {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 2px 0;
    font-weight: 600;
  }
  .ck .cb {
    width: 11px;
    height: 11px;
    border-radius: 3px;
    border: 1.5px solid var(--ink);
    animation-name: ck7;
  }
  .c2 .cb {
    animation-delay: 0.35s;
  }
  .c3 .cb {
    animation-delay: 0.7s;
  }
  @keyframes ck7 {
    0%,
    46% {
      background: transparent;
    }
    50%,
    100% {
      background: var(--ink);
      box-shadow: inset 0 0 0 2px #f1e3c6;
    }
  }

  /* 8 — данные на устройстве, перенос файлом, язык */
  .dev8 {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: var(--gold);
    border-radius: 12px;
    background: linear-gradient(180deg, #2b211b, #17110e);
    box-shadow: inset 0 0 0 2px #4a3828, 0 8px 16px -6px rgba(0, 0, 0, 0.7);
  }
  .lbl {
    font-size: 9px;
    color: var(--muted);
    font-weight: 600;
  }
  .tab {
    left: 8%;
    top: 16%;
    width: 34%;
    height: 56%;
  }
  .ph {
    right: 12%;
    top: 22%;
    width: 18%;
    height: 50%;
    border-radius: 10px;
  }
  .zip8 {
    position: absolute;
    left: 30%;
    top: 40%;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px 7px;
    border-radius: 7px;
    font-weight: 800;
    color: var(--ember-ink);
    background: var(--ember);
    box-shadow: 0 0 14px var(--ember-glow);
    animation-name: zip8;
  }
  @keyframes zip8 {
    0%,
    10% {
      opacity: 0;
      transform: none;
    }
    16% {
      opacity: 1;
      transform: none;
    }
    34% {
      transform: translate(60px, -40px);
    }
    52%,
    60% {
      opacity: 1;
      transform: translate(118px, 0);
    }
    66%,
    100% {
      opacity: 0;
      transform: translate(118px, 0);
    }
  }
  .lang8 {
    position: absolute;
    left: 50%;
    bottom: 7%;
    transform: translateX(-50%);
    display: flex;
    padding: 2px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.4);
    font-weight: 800;
    color: #f6e7cc;
  }
  .lang8 span {
    position: relative;
    z-index: 1;
    width: 34px;
    text-align: center;
    padding: 3px 0;
  }
  .lang8 i {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 34px;
    bottom: 2px;
    border-radius: 6px;
    background: var(--ember);
    box-shadow: 0 0 10px var(--ember-glow);
    animation-name: lang8;
  }
  @keyframes lang8 {
    0%,
    70% {
      transform: none;
    }
    76%,
    94% {
      transform: translateX(34px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .stage * {
      animation: none !important;
    }
    .prompt3,
    .res3,
    .list7,
    .note6,
    .gi.new {
      opacity: 1;
      transform: none;
    }
  }
</style>
