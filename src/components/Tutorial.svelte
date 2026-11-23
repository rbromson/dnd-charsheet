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
   * Обучение: 9 карточек с анимированными сценами (чистый CSS, без картинок — работает офлайн).
   * Первый запуск — открывается само; повтор — «Як користуватися» в панели персонажей и на стартовом экране.
   */
  import Icon from './Icon.svelte';
  import DieShape from '../views/dice/DieShape.svelte';
  import { ui } from '../lib/stores/ui.svelte';
  import { t } from '../lib/i18n';
  import { shareOrCopy } from '../lib/session/share';

  async function ask() {
    const q = `${t('tut.askIntro')}\n\n${t(`tut.${id}.ask`)}`;
    const r = await shareOrCopy(q, t(`tut.${id}.title`));
    if (r === 'copied') ui.toast(t('tut.askCopied'), undefined, 5000);
  }
  import { fade, fly } from 'svelte/transition';

  /** Порядок показа: id карточки (ключи tut.N.*, сцена sN). «Кубики й привал» (9) — сразу после «Бою». */
  const ORDER = [1, 2, 3, 4, 9, 5, 6, 7, 8];
  const TOTAL = ORDER.length;
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
  const id = $derived(ORDER[step]);
</script>

<svelte:window onkeydown={onKey} />

{#if ui.tutorialOpen}
  <div class="layer" transition:fade={{ duration: 160 }}>
    <div class="box" role="dialog" tabindex="-1" aria-modal="true" aria-label={t(`tut.${id}.title`)} onpointerdown={down} onpointerup={up}>
      <div class="top">
        <span class="count">{t('tut.step', { n, total: TOTAL })}</span>
        <button class="skip" onclick={close}>{t('tut.skip')}</button>
      </div>

      {#key step}
        <div class="slide" in:fly={{ x: 40 * dir, duration: 260 }}>
          <div class="stage s{id}" aria-hidden="true">
            {#if id === 1}
              <!-- «Новий персонаж» → три способи -->
              <div class="g1"><DieShape sides={20} value="20" size={62} tone="ember" /></div>
              <span class="pl pri n1"><Icon name="plus" size={12} />{t('chars.new')}</span>
              <div class="ways1">
                <span class="pp w1 a"><Icon name="edit" size={11} />{t('newc.manual')}</span>
                <span class="pp w1 b"><Icon name="sparkle" size={11} />{t('newc.ai')}</span>
                <span class="pp w1 c"><Icon name="upload" size={11} />{t('newc.file')}</span>
              </div>
              <div class="finger f1"><span class="ripple"></span></div>
            {:else if id === 2}
              <!-- «Гра»: тап по навичці кидає; «Правка»: те саме поле стає редагованим -->
              <div class="sg sg2"><span>{t('mode.play')}</span><span>{t('mode.edit')}</span><i class="th2"></i></div>
              <div class="pp row2"><span class="dt"></span>{t('skill.deception')}<b>+5</b></div>
              <div class="bub2"><Icon name="dice" size={11} />17</div>
              <div class="pp ed2"><span>{t('skill.deception')}</span><span class="inp">+5<i></i></span></div>
              <div class="finger f2"><span class="ripple"></span></div>
            {:else if id === 3}
              <!-- тап по стату → вікно кидка: «Перевага» → кубик → результат -->
              <div class="pp tile3"><Icon name="dice" size={11} />{t('skill.deception')}<b>+5</b></div>
              <div class="win3">
                <div class="sg sg3"><span>{t('roll.dis')}</span><span>{t('roll.normal')}</span><span class="ad">{t('roll.adv')}</span></div>
                <div class="d3"><DieShape sides={20} value="20" size={44} tone="ember" /></div>
                <div class="r3 num">22</div>
              </div>
              <div class="finger f3"><span class="ripple"></span></div>
            {:else if id === 4}
              <!-- число → «Шкода» → ОЗ зменшуються -->
              <div class="pp hp4">
                <div class="hpn num"><span class="a">35</span><span class="b">28</span><small>/ 43</small></div>
                <div class="bar4"><i></i></div>
              </div>
              <div class="disp4 num"><span>7</span></div>
              <span class="pl dmg4">− {t('combat.damage')}</span>
              <div class="pad4">
                {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as k (k)}<span class="key4" class:k7={k === '7'}>{k}</span>{/each}
              </div>
              <div class="finger f4"><span class="ripple"></span></div>
            {:else if id === 5}
              <!-- «Додати» → «З бібліотеки» → заповнена картка → у списку -->
              <div class="pp list5">
                <div class="hd"><Icon name="gear" size={11} />{t('nav.gear')}</div>
                <div class="gi">{t('tut.s5.potion')}</div>
                <div class="gi new">{t('tut.s5.sword')}</div>
              </div>
              <span class="pl pri add5"><Icon name="plus" size={11} />{t('add.confirm')}</span>
              <div class="ch5">
                <span class="pp w5 lib"><Icon name="search" size={11} />{t('add.library')}</span>
                <span class="pp w5"><Icon name="edit" size={11} />{t('add.manual')}</span>
              </div>
              <div class="pp card5">
                <b>{t('tut.s5.sword')}</b>
                <span class="st5 num">1к8 · ⚔ +4</span>
                <span class="bt5"><i class="pl">{t('common.cancel')}</i><i class="pl pri">{t('add.confirm')}</i></span>
              </div>
              <div class="finger f5"><span class="ripple"></span></div>
            {:else if id === 6}
              <!-- печатка-перо → нотатка з @згадкою → запис у журналі -->
              <div class="seal6"><Icon name="feather" size={18} stroke={2} /></div>
              <div class="pp note6">
                <div class="hd"><Icon name="feather" size={11} />{t('journal.quick.title')}</div>
                <div class="txt6"><span class="type6">{t('tut.s6.text')}</span><span class="men6">@{t('tut.s6.npc')}</span></div>
                <span class="pl pri sv6">{t('journal.quick.save')}</span>
              </div>
              <div class="pp row6">
                <span class="sn6">{t('journal.box.session')}<b>1</b></span>
                <span>{t('tut.s6.text')} <span class="men6 on">{t('tut.s6.npc')}</span></span>
              </div>
              <div class="finger f6"><span class="ripple"></span></div>
            {:else if id === 7}
              <!-- нотатки → ШІ → список змін з галочками -->
              <div class="pp n7"><Icon name="feather" size={11} /><span class="ln w80"></span><span class="ln w60"></span><span class="ln w70"></span></div>
              <div class="ar7"><span></span><span></span><span></span></div>
              <div class="ai7"><Icon name="sparkle" size={18} /></div>
              <div class="pp list7">
                <div class="ck7 c1"><span class="cb"></span>+2 {t('tut.s5.potion')}</div>
                <div class="ck7 c2"><span class="cb"></span>+15 {t('gear.coin.gp')}</div>
                <div class="ck7 c3"><span class="cb"></span>{t('tut.s6.npc')}</div>
              </div>
            {:else if id === 9}
              <div class="rest9"><Icon name="coffee" size={16} stroke={2} /></div>
              <div class="gem9"><span>20</span></div>
              <div class="tray9 ta">
                <div class="th">{t('dice.tray.title')}</div>
                <div class="tb">
                  <DieShape sides={20} value="17" size={44} tone="ember" />
                  <b class="num">17</b>
                </div>
              </div>
              <div class="tray9 tr">
                <div class="th">{t('rest.title')}</div>
                <div class="seg9"><span class="on">{t('rest.short')}</span><span>{t('rest.long')}</span></div>
                <div class="hd9"><Icon name="heart" size={11} />{t('combat.hitDice')} <b>+7</b></div>
              </div>
              <div class="finger f9"><span class="ripple"></span></div>
            {:else}
              <!-- дані на пристрої; файл переносить персонажа; мова -->
              <div class="dev8 tab"><Icon name="lock" size={16} /><span>{t('tut.s8.tablet')}</span></div>
              <div class="dev8 ph"><Icon name="lock" size={13} /><span>{t('tut.s8.phone')}</span></div>
              <div class="zip8"><Icon name="download" size={11} />.zip</div>
              <div class="sg lang8"><span>UA</span><span>EN</span><i></i></div>
            {/if}
          </div>

          <h2 class="sc">{t(`tut.${id}.title`)}</h2>
          <ul>
            <li>{t(`tut.${id}.p1`)}</li>
            <li>{t(`tut.${id}.p2`)}</li>
            <li>{t(`tut.${id}.p3`)}</li>
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

  /* ===== мини-интерфейс сцен: пластина, пергаментная строка, сегменты ===== */
  .pl {
    position: absolute;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 3px;
    font-family: var(--font-sc);
    font-weight: 700;
    font-size: 10.5px;
    font-style: normal;
    color: #f0dcb6;
    white-space: nowrap;
    background: linear-gradient(180deg, #3a2b22, #1d140f);
    box-shadow: inset 0 0 0 1px #c89a4e;
  }
  .pl.pri {
    color: #fff1dc;
    background: radial-gradient(ellipse 120% 90% at 50% 0%, #c9682f, #9a3f18 45%, #5e200b);
    box-shadow:
      inset 0 0 0 1px #e3bd73,
      0 0 10px rgba(232, 116, 59, 0.35);
  }
  .pp {
    position: absolute;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 10.5px;
    white-space: nowrap;
    color: var(--ink);
    background: var(--paper);
    background-size: 180px 180px, 520px 520px, 100% 100%;
    box-shadow:
      inset 0 0 0 1px rgba(150, 112, 62, 0.6),
      0 4px 10px -4px rgba(0, 0, 0, 0.7);
  }
  .pp b {
    margin-left: auto;
  }
  .sg {
    position: absolute;
    display: flex;
    padding: 2px;
    border-radius: 3px;
    background: #120c09;
    box-shadow: inset 0 0 0 1px #8a6434;
  }
  .sg span {
    position: relative;
    z-index: 1;
    flex: 1;
    text-align: center;
    padding: 3px 5px;
    font-family: var(--font-sc);
    font-weight: 700;
    font-size: 10px;
    color: #c9b08c;
    white-space: nowrap;
  }
  .sg i {
    position: absolute;
    top: 2px;
    bottom: 2px;
    border-radius: 2px;
    background: linear-gradient(180deg, #4a372b, #24190f);
    box-shadow: inset 0 0 0 1px #e3bd73;
  }
  /* палец: left/top — центр касания */
  .f1,
  .f2,
  .f3,
  .f4,
  .f5,
  .f6 {
    margin: -13px 0 0 -13px;
  }

  /* 1 — «Новий персонаж» → три способи */
  .g1 {
    position: absolute;
    left: 7%;
    top: 50%;
    transform: translateY(-50%);
    animation-name: float1;
  }
  @keyframes float1 {
    0%,
    100% {
      transform: translateY(-50%);
    }
    50% {
      transform: translateY(-58%);
    }
  }
  .n1 {
    left: 42%;
    right: 6%;
    top: 10%;
    animation-name: press1;
  }
  @keyframes press1 {
    0%,
    12%,
    18%,
    100% {
      transform: none;
    }
    14% {
      transform: scale(0.92);
    }
  }
  .ways1 {
    position: absolute;
    left: 42%;
    right: 6%;
    top: 34%;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .w1 {
    position: relative;
    opacity: 0;
    animation-name: way1;
  }
  .w1.b {
    animation-name: way1b;
  }
  .w1.c {
    animation-name: way1c;
  }
  @keyframes way1 {
    0%,
    18% {
      opacity: 0;
      transform: translateY(6px);
    }
    22%,
    92% {
      opacity: 1;
      transform: none;
    }
    97%,
    100% {
      opacity: 0;
    }
  }
  @keyframes way1b {
    0%,
    21% {
      opacity: 0;
      transform: translateY(6px);
    }
    25%,
    44% {
      opacity: 1;
      transform: none;
    }
    48%,
    62% {
      opacity: 1;
      transform: none;
      box-shadow:
        inset 0 0 0 1.5px #e3bd73,
        0 0 12px rgba(240, 190, 100, 0.6);
    }
    66%,
    92% {
      opacity: 1;
    }
    97%,
    100% {
      opacity: 0;
    }
  }
  @keyframes way1c {
    0%,
    24% {
      opacity: 0;
      transform: translateY(6px);
    }
    28%,
    92% {
      opacity: 1;
      transform: none;
    }
    97%,
    100% {
      opacity: 0;
    }
  }
  .f1 {
    animation-name: f1;
  }
  .f1 .ripple {
    animation-name: rip1;
  }
  @keyframes f1 {
    0% {
      left: 72%;
      top: 108%;
    }
    10%,
    18% {
      left: 70%;
      top: 18%;
    }
    32% {
      left: 70%;
      top: 22%;
    }
    42%,
    52% {
      left: 70%;
      top: 54%;
    }
    72%,
    100% {
      left: 86%;
      top: 110%;
    }
  }
  @keyframes rip1 {
    0%,
    12%,
    20%,
    44%,
    54%,
    100% {
      opacity: 0;
      transform: scale(0.6);
    }
    14%,
    47% {
      opacity: 1;
      transform: scale(1);
    }
    18%,
    52% {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  /* 2 — «Гра» кидає, «Правка» відкриває поле */
  .sg2 {
    left: 50%;
    top: 8%;
    width: 60%;
    transform: translateX(-50%);
  }
  .th2 {
    left: 2px;
    width: calc(50% - 2px);
    animation-name: th2;
  }
  @keyframes th2 {
    0%,
    46% {
      left: 2px;
    }
    50%,
    96% {
      left: 50%;
    }
    100% {
      left: 2px;
    }
  }
  .row2,
  .ed2 {
    left: 10%;
    right: 10%;
    top: 42%;
  }
  .row2 {
    animation-name: row2;
  }
  .dt {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ink);
  }
  @keyframes row2 {
    0%,
    46% {
      opacity: 1;
    }
    50%,
    96% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  .bub2 {
    position: absolute;
    right: 12%;
    top: 24%;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px 7px;
    border-radius: 3px;
    font-weight: 800;
    color: #fff1dc;
    background: radial-gradient(ellipse 120% 90% at 50% 0%, #c9682f, #9a3f18 45%, #5e200b);
    box-shadow: inset 0 0 0 1px #e3bd73;
    opacity: 0;
    animation-name: bub2;
  }
  @keyframes bub2 {
    0%,
    16% {
      opacity: 0;
      transform: scale(0.6);
    }
    20%,
    40% {
      opacity: 1;
      transform: none;
    }
    44%,
    100% {
      opacity: 0;
    }
  }
  .ed2 {
    opacity: 0;
    outline: 1px dashed rgba(107, 90, 72, 0.6);
    outline-offset: 2px;
    animation-name: ed2;
  }
  @keyframes ed2 {
    0%,
    50% {
      opacity: 0;
    }
    54%,
    94% {
      opacity: 1;
    }
    98%,
    100% {
      opacity: 0;
    }
  }
  .inp {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 1px;
    padding: 1px 6px;
    border-radius: 2px;
    font-weight: 700;
    background: #fffaf0;
    box-shadow: inset 0 0 0 1px #c89a4e;
  }
  .inp i {
    width: 1px;
    height: 10px;
    background: var(--ink);
    animation-name: caret2;
    animation-timing-function: steps(1);
  }
  @keyframes caret2 {
    0%,
    72% {
      opacity: 0;
    }
    76%,
    82%,
    88% {
      opacity: 1;
    }
    79%,
    85%,
    92%,
    100% {
      opacity: 0;
    }
  }
  .f2 {
    animation-name: f2;
  }
  .f2 .ripple {
    animation-name: rip2;
  }
  @keyframes f2 {
    0% {
      left: 50%;
      top: 108%;
    }
    10%,
    17% {
      left: 46%;
      top: 50%;
    }
    40%,
    50% {
      left: 64%;
      top: 15%;
    }
    68%,
    78% {
      left: 82%;
      top: 50%;
    }
    100% {
      left: 82%;
      top: 110%;
    }
  }
  @keyframes rip2 {
    0%,
    11%,
    19%,
    44%,
    51%,
    72%,
    79%,
    100% {
      opacity: 0;
      transform: scale(0.6);
    }
    13%,
    46%,
    74% {
      opacity: 1;
      transform: scale(1);
    }
    17%,
    50%,
    78% {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  /* 3 — вікно кидка */
  .tile3 {
    left: 5%;
    top: 12%;
    animation-name: tile3;
  }
  @keyframes tile3 {
    0%,
    8%,
    14%,
    100% {
      transform: none;
    }
    10% {
      transform: scale(0.92);
    }
  }
  .win3 {
    position: absolute;
    left: 38%;
    right: 5%;
    top: 6%;
    bottom: 6%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 5px;
    border-radius: 4px;
    background: linear-gradient(180deg, #3a2b22, #17100c);
    box-shadow:
      inset 0 0 0 1px #c89a4e,
      0 10px 20px -8px #000;
    opacity: 0;
    animation-name: win3;
  }
  @keyframes win3 {
    0%,
    13% {
      opacity: 0;
      transform: translateY(8px) scale(0.96);
    }
    18%,
    92% {
      opacity: 1;
      transform: none;
    }
    97%,
    100% {
      opacity: 0;
    }
  }
  .sg3 {
    position: relative;
    width: 100%;
  }
  .sg3 span {
    font-size: 8.5px;
    padding: 3px 1px;
  }
  .sg3 .ad {
    border-radius: 2px;
    animation-name: ad3;
  }
  @keyframes ad3 {
    0%,
    32% {
      color: #c9b08c;
      box-shadow: none;
    }
    35%,
    92% {
      color: #ffe39a;
      background: linear-gradient(180deg, #4a3a22, #1f170c);
      box-shadow: inset 0 0 0 1px #e3bd73;
    }
  }
  .d3 {
    margin-top: 6px;
    animation-name: d3;
  }
  @keyframes d3 {
    0%,
    50% {
      transform: none;
    }
    66%,
    100% {
      transform: rotate(720deg);
    }
  }
  .r3 {
    margin-top: 2px;
    font-size: 22px;
    font-weight: 800;
    line-height: 1;
    color: var(--gold);
    text-shadow: 0 0 12px rgba(240, 190, 100, 0.6);
    opacity: 0;
    animation-name: r3;
  }
  @keyframes r3 {
    0%,
    66% {
      opacity: 0;
      transform: scale(0.5);
    }
    70%,
    92% {
      opacity: 1;
      transform: none;
    }
    97%,
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
      left: 20%;
      top: 108%;
    }
    7%,
    12% {
      left: 20%;
      top: 18%;
    }
    28%,
    36% {
      left: 84%;
      top: 15%;
    }
    48%,
    56% {
      left: 69%;
      top: 44%;
    }
    80%,
    100% {
      left: 92%;
      top: 110%;
    }
  }
  @keyframes rip3 {
    0%,
    8%,
    14%,
    31%,
    37%,
    51%,
    57%,
    100% {
      opacity: 0;
      transform: scale(0.6);
    }
    10%,
    33%,
    53% {
      opacity: 1;
      transform: scale(1);
    }
    13%,
    36%,
    56% {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  /* 4 — число → «Шкода» */
  .hp4 {
    left: 5%;
    top: 8%;
    width: 44%;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    animation-name: hp4;
  }
  @keyframes hp4 {
    0%,
    36%,
    52%,
    100% {
      box-shadow:
        inset 0 0 0 1px rgba(150, 112, 62, 0.6),
        0 4px 10px -4px rgba(0, 0, 0, 0.7);
    }
    40% {
      box-shadow:
        inset 0 0 0 2px #c0533f,
        0 0 16px rgba(192, 83, 63, 0.6);
    }
  }
  .hpn {
    position: relative;
    height: 22px;
    font-size: 20px;
    font-weight: 800;
    line-height: 22px;
  }
  .hpn .a,
  .hpn .b {
    position: absolute;
    left: 0;
  }
  .hpn .a {
    animation-name: a4;
  }
  .hpn .b {
    color: #b8412c;
    opacity: 0;
    animation-name: b4;
  }
  .hpn small {
    margin-left: 32px;
    font-size: 10px;
    color: var(--ink2);
  }
  @keyframes a4 {
    0%,
    38% {
      opacity: 1;
    }
    42%,
    94% {
      opacity: 0;
    }
    98%,
    100% {
      opacity: 1;
    }
  }
  @keyframes b4 {
    0%,
    38% {
      opacity: 0;
    }
    42%,
    94% {
      opacity: 1;
    }
    98%,
    100% {
      opacity: 0;
    }
  }
  .bar4 {
    height: 5px;
    border-radius: 3px;
    overflow: hidden;
    background: rgba(107, 90, 72, 0.25);
  }
  .bar4 i {
    display: block;
    height: 100%;
    width: 81%;
    background: var(--good);
    animation-name: bar4;
  }
  @keyframes bar4 {
    0%,
    38% {
      width: 81%;
    }
    46%,
    94% {
      width: 65%;
    }
    100% {
      width: 81%;
    }
  }
  .disp4 {
    position: absolute;
    left: 5%;
    top: 44%;
    width: 44%;
    height: 20%;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    font-size: 18px;
    font-weight: 700;
    color: #f0dcb6;
    background: rgba(0, 0, 0, 0.35);
    box-shadow: inset 0 0 0 1px rgba(214, 170, 110, 0.3);
  }
  .disp4 span {
    opacity: 0;
    animation-name: disp4;
  }
  @keyframes disp4 {
    0%,
    12% {
      opacity: 0;
    }
    15%,
    38% {
      opacity: 1;
    }
    42%,
    100% {
      opacity: 0;
    }
  }
  .dmg4 {
    left: 5%;
    width: 44%;
    top: 70%;
    color: #fff0ea;
    background: radial-gradient(ellipse 120% 90% at 50% 0%, #d6604a, #a3382a 45%, #5a160e);
    animation-name: dmg4;
  }
  @keyframes dmg4 {
    0%,
    33%,
    38%,
    100% {
      transform: none;
    }
    35% {
      transform: scale(0.93);
    }
  }
  .pad4 {
    position: absolute;
    right: 5%;
    top: 8%;
    width: 42%;
    height: 62%;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
    gap: 3px;
  }
  .key4 {
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    font-weight: 700;
    font-size: 11px;
    color: var(--ink);
    background: linear-gradient(180deg, #fffaf0, #e8d6b0);
    box-shadow: inset 0 0 0 1px #c89a4e;
  }
  .k7 {
    animation-name: k7;
  }
  @keyframes k7 {
    0%,
    9%,
    15%,
    100% {
      transform: none;
      background: linear-gradient(180deg, #fffaf0, #e8d6b0);
    }
    11% {
      transform: scale(0.9);
      background: #e6b450;
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
      top: 108%;
    }
    8%,
    14% {
      left: 60%;
      top: 60%;
    }
    30%,
    38% {
      left: 27%;
      top: 77%;
    }
    70%,
    100% {
      left: 22%;
      top: 110%;
    }
  }
  @keyframes rip4 {
    0%,
    9%,
    15%,
    33%,
    39%,
    100% {
      opacity: 0;
      transform: scale(0.6);
    }
    11%,
    35% {
      opacity: 1;
      transform: scale(1);
    }
    14%,
    38% {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  /* 5 — «Додати» → бібліотека → заповнена картка → у списку */
  .list5 {
    left: 5%;
    top: 8%;
    bottom: 8%;
    width: 40%;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 3px;
    white-space: normal;
  }
  .gi {
    padding: 3px 5px;
    border-radius: 2px;
    font-size: 10px;
    background: rgba(42, 31, 23, 0.06);
  }
  .gi.new {
    opacity: 0;
    animation-name: new5;
  }
  @keyframes new5 {
    0%,
    66% {
      opacity: 0;
      transform: translateX(10px);
    }
    72%,
    94% {
      opacity: 1;
      transform: none;
      background: rgba(230, 180, 80, 0.3);
      box-shadow: inset 0 0 0 1px #c89a4e;
    }
    98%,
    100% {
      opacity: 0;
    }
  }
  .add5 {
    right: 6%;
    top: 8%;
    animation-name: press5;
  }
  @keyframes press5 {
    0%,
    6%,
    11%,
    100% {
      transform: none;
    }
    8% {
      transform: scale(0.9);
    }
  }
  .ch5 {
    position: absolute;
    right: 6%;
    top: 30%;
    width: 44%;
    display: flex;
    flex-direction: column;
    gap: 4px;
    opacity: 0;
    animation-name: ch5;
  }
  .ch5 .pp {
    position: relative;
  }
  @keyframes ch5 {
    0%,
    10% {
      opacity: 0;
      transform: translateY(6px);
    }
    14%,
    28% {
      opacity: 1;
      transform: none;
    }
    32%,
    100% {
      opacity: 0;
    }
  }
  .w5.lib {
    animation-name: lib5;
  }
  @keyframes lib5 {
    0%,
    22%,
    30%,
    100% {
      box-shadow: inset 0 0 0 1px rgba(150, 112, 62, 0.6);
    }
    24%,
    28% {
      box-shadow:
        inset 0 0 0 1.5px #e3bd73,
        0 0 10px rgba(240, 190, 100, 0.6);
    }
  }
  .card5 {
    right: 6%;
    top: 24%;
    bottom: 20%;
    width: 44%;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    white-space: normal;
    opacity: 0;
    animation-name: card5;
  }
  .card5 b {
    margin: 0;
    font-family: var(--font-serif);
    font-size: 12px;
  }
  .st5 {
    font-size: 10px;
    color: var(--ink2);
  }
  .bt5 {
    display: flex;
    gap: 4px;
    margin-top: auto;
  }
  .bt5 .pl {
    position: static;
    flex: 1;
    padding: 3px 4px;
    font-size: 9px;
  }
  @keyframes card5 {
    0%,
    30% {
      opacity: 0;
      transform: translateY(8px);
    }
    34%,
    62% {
      opacity: 1;
      transform: none;
    }
    66%,
    100% {
      opacity: 0;
    }
  }
  .f5 {
    animation-name: f5;
  }
  .f5 .ripple {
    animation-name: rip5;
  }
  @keyframes f5 {
    0% {
      left: 80%;
      top: 108%;
    }
    5%,
    10% {
      left: 86%;
      top: 15%;
    }
    20%,
    27% {
      left: 74%;
      top: 36%;
    }
    50%,
    58% {
      left: 84%;
      top: 72%;
    }
    80%,
    100% {
      left: 90%;
      top: 110%;
    }
  }
  @keyframes rip5 {
    0%,
    6%,
    11%,
    22%,
    28%,
    52%,
    59%,
    100% {
      opacity: 0;
      transform: scale(0.6);
    }
    8%,
    24%,
    54% {
      opacity: 1;
      transform: scale(1);
    }
    10%,
    27%,
    58% {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  /* 6 — печатка-перо → нотатка → запис у журналі */
  .seal6 {
    position: absolute;
    left: 6%;
    bottom: 10%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 47% 53% 50% 50% / 52% 46% 54% 48%;
    color: #4a1606;
    background:
      radial-gradient(circle at 50% 50%, transparent 52%, rgba(90, 24, 6, 0.35) 56%, transparent 60%),
      radial-gradient(circle at 36% 28%, #ffb27c, var(--ember) 42%, #b4481c 72%, #7a2a10);
    box-shadow:
      0 3px 0 #6a240c,
      0 6px 10px rgba(0, 0, 0, 0.5);
    animation-name: seal6;
  }
  @keyframes seal6 {
    0%,
    6%,
    11%,
    100% {
      transform: none;
    }
    8% {
      transform: translateY(3px) rotate(-6deg);
    }
  }
  .note6 {
    left: 26%;
    right: 5%;
    top: 10%;
    bottom: 10%;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    white-space: normal;
    opacity: 0;
    animation-name: note6;
  }
  @keyframes note6 {
    0%,
    10% {
      opacity: 0;
      transform: translateY(20%);
    }
    15%,
    60% {
      opacity: 1;
      transform: none;
    }
    64%,
    100% {
      opacity: 0;
      transform: scale(0.92);
    }
  }
  .txt6 {
    font-size: 11px;
    line-height: 1.4;
  }
  .type6 {
    display: inline-block;
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    vertical-align: bottom;
    animation-name: type6;
    animation-timing-function: steps(24);
  }
  @keyframes type6 {
    0%,
    16% {
      max-width: 0;
    }
    36%,
    100% {
      max-width: 14em;
    }
  }
  .men6 {
    display: inline-block;
    margin-left: 3px;
    padding: 0 4px;
    border-radius: 3px;
    font-weight: 700;
    color: #8e2f20;
    background: rgba(184, 65, 44, 0.15);
    opacity: 0;
    animation-name: men6;
  }
  .men6.on {
    opacity: 1;
    animation: none;
  }
  @keyframes men6 {
    0%,
    38% {
      opacity: 0;
    }
    42%,
    100% {
      opacity: 1;
    }
  }
  .sv6 {
    position: static;
    align-self: flex-end;
    margin-top: auto;
    animation-name: sv6;
  }
  @keyframes sv6 {
    0%,
    54%,
    59%,
    100% {
      transform: none;
    }
    56% {
      transform: scale(0.9);
    }
  }
  .row6 {
    left: 26%;
    right: 5%;
    top: 32%;
    gap: 7px;
    white-space: normal;
    opacity: 0;
    animation-name: row6;
  }
  @keyframes row6 {
    0%,
    62% {
      opacity: 0;
      transform: translateY(6px);
    }
    68%,
    94% {
      opacity: 1;
      transform: none;
    }
    98%,
    100% {
      opacity: 0;
    }
  }
  .sn6 {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2px 4px;
    border-radius: 2px;
    font-size: 7.5px;
    letter-spacing: 0.1em;
    color: var(--ink2);
    box-shadow: inset 0 0 0 1px rgba(150, 112, 62, 0.5);
  }
  .sn6 b {
    margin: 0;
    font-size: 13px;
    color: var(--ink);
  }
  .f6 {
    animation-name: f6;
  }
  .f6 .ripple {
    animation-name: rip6;
  }
  @keyframes f6 {
    0% {
      left: 30%;
      top: 108%;
    }
    4%,
    10% {
      left: 13%;
      top: 79%;
    }
    30% {
      left: 50%;
      top: 104%;
    }
    50%,
    58% {
      left: 86%;
      top: 80%;
    }
    80%,
    100% {
      left: 74%;
      top: 110%;
    }
  }
  @keyframes rip6 {
    0%,
    5%,
    11%,
    53%,
    59%,
    100% {
      opacity: 0;
      transform: scale(0.6);
    }
    7%,
    55% {
      opacity: 1;
      transform: scale(1);
    }
    10%,
    58% {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  /* 7 — нотатки → ШІ → список змін */
  .n7 {
    left: 5%;
    top: 22%;
    width: 26%;
    height: 56%;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: 0;
    padding: 6px;
    color: var(--ink2);
  }
  .ar7 {
    position: absolute;
    left: 34%;
    top: 50%;
    display: flex;
    gap: 2px;
    transform: translateY(-50%);
  }
  .ar7 span {
    width: 7px;
    height: 7px;
    transform: rotate(45deg);
    border-top: 2px solid #e3bd73;
    border-right: 2px solid #e3bd73;
    opacity: 0.2;
    animation-name: ar7;
  }
  .ar7 span:nth-child(2) {
    animation-name: ar7b;
  }
  .ar7 span:nth-child(3) {
    animation-name: ar7c;
  }
  @keyframes ar7 {
    0%,
    6%,
    22%,
    100% {
      opacity: 0.2;
    }
    12% {
      opacity: 1;
    }
  }
  @keyframes ar7b {
    0%,
    10%,
    26%,
    100% {
      opacity: 0.2;
    }
    16% {
      opacity: 1;
    }
  }
  @keyframes ar7c {
    0%,
    14%,
    30%,
    100% {
      opacity: 0.2;
    }
    20% {
      opacity: 1;
    }
  }
  .ai7 {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 38px;
    height: 38px;
    margin: -19px 0 0 -19px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #fff0d6;
    background: radial-gradient(circle at 50% 35%, #f39a5c, #b0481c);
    box-shadow:
      0 0 0 2px #e3bd73,
      0 0 14px rgba(232, 116, 59, 0.5);
    animation-name: ai7;
  }
  @keyframes ai7 {
    0%,
    18%,
    34%,
    100% {
      transform: none;
    }
    26% {
      transform: scale(1.15) rotate(20deg);
    }
  }
  .list7 {
    right: 5%;
    top: 18%;
    bottom: 18%;
    width: 34%;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
    gap: 5px;
  }
  .ck7 {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    opacity: 0;
  }
  .ck7 .cb {
    flex-shrink: 0;
    width: 11px;
    height: 11px;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1.5px var(--ink2);
  }
  .c1 {
    animation-name: ck1;
  }
  .c2 {
    animation-name: ck2;
  }
  .c3 {
    animation-name: ck3;
  }
  .c1 .cb {
    animation-name: cb1;
  }
  .c2 .cb {
    animation-name: cb2;
  }
  .c3 .cb {
    animation-name: cb3;
  }
  @keyframes ck1 {
    0%,
    32% {
      opacity: 0;
    }
    36%,
    94% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  @keyframes ck2 {
    0%,
    38% {
      opacity: 0;
    }
    42%,
    94% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  @keyframes ck3 {
    0%,
    44% {
      opacity: 0;
    }
    48%,
    94% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  @keyframes cb1 {
    0%,
    54% {
      background: transparent;
    }
    58%,
    100% {
      background: var(--good);
    }
  }
  @keyframes cb2 {
    0%,
    62% {
      background: transparent;
    }
    66%,
    100% {
      background: var(--good);
    }
  }
  @keyframes cb3 {
    0%,
    70% {
      background: transparent;
    }
    74%,
    100% {
      background: var(--good);
    }
  }

  /* 8 — дані на пристрої, перенесення файлом, мова */
  .dev8 {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    border-radius: 6px;
    font-family: var(--font-sc);
    font-weight: 700;
    font-size: 10px;
    color: #e3c48a;
    background: linear-gradient(180deg, #2c1f18, #150e0b);
    box-shadow: inset 0 0 0 1.5px #8a6434;
  }
  .dev8.tab {
    left: 6%;
    top: 12%;
    width: 46%;
    height: 54%;
  }
  .dev8.ph {
    right: 10%;
    top: 8%;
    width: 17%;
    height: 62%;
  }
  .zip8 {
    position: absolute;
    left: 24%;
    top: 34%;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: 700;
    font-size: 10px;
    color: #fff1dc;
    background: radial-gradient(ellipse 120% 90% at 50% 0%, #c9682f, #9a3f18 45%, #5e200b);
    box-shadow: inset 0 0 0 1px #e3bd73;
    opacity: 0;
    animation-name: zip8;
  }
  @keyframes zip8 {
    0%,
    12% {
      left: 24%;
      opacity: 0;
    }
    18% {
      left: 24%;
      opacity: 1;
    }
    52% {
      left: 74%;
      opacity: 1;
    }
    60%,
    100% {
      left: 74%;
      opacity: 0;
    }
  }
  .lang8 {
    left: 50%;
    bottom: 7%;
    width: 74px;
    transform: translateX(-50%);
  }
  .lang8 i {
    left: 2px;
    width: calc(50% - 2px);
    animation-name: lang8;
  }
  @keyframes lang8 {
    0%,
    68% {
      left: 2px;
    }
    74%,
    94% {
      left: 50%;
    }
    100% {
      left: 2px;
    }
  }

  /* 9 — кубики й привал */
  .s9 {
    --T: 6s;
  }
  .rest9 {
    position: absolute;
    right: 9%;
    bottom: 47%;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffd29a;
    background:
      radial-gradient(circle at 50% 78%, rgba(255, 140, 60, 0.55), transparent 55%),
      radial-gradient(circle at 50% 50%, #3a2416 0 62%, transparent 64%),
      linear-gradient(160deg, #f0cd85, #b07c38 35%, #6e4a1c 70%, #9b7440);
    box-shadow: 0 3px 0 #4e3312, 0 6px 10px rgba(0, 0, 0, 0.5);
    animation-name: press9b;
  }
  .gem9 {
    position: absolute;
    right: 7%;
    bottom: 16%;
    width: 38px;
    height: 43px;
    display: flex;
    align-items: center;
    justify-content: center;
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
    background: conic-gradient(#f7a066 0 60deg, #d86a32 60deg 120deg, #8a3212 120deg 180deg, #a8441a 180deg 240deg, #e88450 240deg 300deg, #ffc08a 300deg 360deg);
    animation-name: press9a;
  }
  .gem9 span {
    font-family: var(--font-serif);
    font-weight: 700;
    font-size: 13px;
    color: #2a1206;
    padding: 4px 3px;
    background: radial-gradient(circle, #fbb886, #ea8148);
    clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  }
  @keyframes press9a {
    0%,
    12% {
      transform: none;
    }
    15% {
      transform: translateY(3px) scale(0.92);
    }
    19%,
    100% {
      transform: none;
    }
  }
  @keyframes press9b {
    0%,
    58% {
      transform: none;
    }
    61% {
      transform: translateY(3px) scale(0.9);
    }
    65%,
    100% {
      transform: none;
    }
  }
  .tray9 {
    position: absolute;
    left: 6%;
    right: 26%;
    bottom: 8%;
    top: 14%;
    border-radius: 10px;
    padding: 6px 8px;
    color: var(--parch);
    background: linear-gradient(180deg, #2c1f18, #150e0b);
    box-shadow:
      inset 0 0 0 1px rgba(214, 170, 110, 0.35),
      0 8px 18px -6px rgba(0, 0, 0, 0.8);
    opacity: 0;
  }
  .th {
    font-family: var(--font-sc);
    font-weight: 700;
    font-size: 12px;
    margin-bottom: 4px;
  }
  .tb {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: calc(100% - 22px);
  }
  .tb b {
    font-size: 30px;
    color: var(--ember);
    font-family: var(--font-serif);
  }
  .ta {
    animation-name: tray9a;
  }
  .tr {
    animation-name: tray9b;
  }
  @keyframes tray9a {
    0%,
    16% {
      opacity: 0;
      transform: translateY(30%);
    }
    22%,
    46% {
      opacity: 1;
      transform: none;
    }
    52%,
    100% {
      opacity: 0;
      transform: translateY(30%);
    }
  }
  @keyframes tray9b {
    0%,
    62% {
      opacity: 0;
      transform: translateY(30%);
    }
    68%,
    92% {
      opacity: 1;
      transform: none;
    }
    98%,
    100% {
      opacity: 0;
      transform: translateY(30%);
    }
  }
  .seg9 {
    display: flex;
    gap: 3px;
    padding: 3px;
    margin: 6px 0 8px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.4);
    box-shadow: inset 0 0 0 1px rgba(155, 116, 64, 0.6);
  }
  .seg9 span {
    flex: 1;
    text-align: center;
    padding: 3px 0;
    font-family: var(--font-sc);
    font-weight: 700;
    font-size: 10.5px;
    color: #a8916f;
  }
  .seg9 .on {
    color: #ffe6b8;
    background: linear-gradient(180deg, #4a372b, #24190f);
    box-shadow: inset 0 0 0 1px #d6aa60;
  }
  .hd9 {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
  }
  .hd9 b {
    margin-left: auto;
    color: #7fd37a;
  }
  .f9 {
    animation-name: f9;
  }
  .f9 .ripple {
    animation-name: rip9;
  }
  @keyframes f9 {
    0% {
      left: 40%;
      top: 100%;
    }
    11%,
    16% {
      left: 87%;
      top: 66%;
    }
    40% {
      left: 70%;
      top: 96%;
    }
    57%,
    62% {
      left: 88%;
      top: 38%;
    }
    100% {
      left: 70%;
      top: 104%;
    }
  }
  @keyframes rip9 {
    0%,
    12% {
      opacity: 0;
      transform: scale(0.6);
    }
    14% {
      opacity: 1;
      transform: scale(1);
    }
    20%,
    57% {
      opacity: 0;
      transform: scale(1.8);
    }
    59% {
      opacity: 1;
      transform: scale(1);
    }
    66%,
    100% {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .stage * {
      animation: none !important;
    }
    .w1,
    .win3,
    .r3,
    .card5,
    .gi.new,
    .note6,
    .ck7,
    .ta {
      opacity: 1;
      transform: none;
    }
    .type6 {
      max-width: none;
    }
  }
</style>
