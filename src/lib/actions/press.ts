import type { Action } from 'svelte/action';

export interface PressOptions {
  onTap?: (e: PointerEvent) => void;
  /** Долгое нажатие (по умолчанию 450 мс) */
  onLong?: (e: PointerEvent) => void;
  delay?: number;
}

/**
 * Тап и долгий тап на одном элементе. Долгий тап отменяет тап.
 * Движение пальца > 10 px (прокрутка) отменяет оба.
 * Использование: <button use:press={{ onTap: roll, onLong: openSettings }}>
 */
export const press: Action<HTMLElement, PressOptions> = (node, initial) => {
  let opts = initial;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let startX = 0;
  let startY = 0;
  let longFired = false;
  let active = false;
  let tapOk = false;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    active = true;
    longFired = false;
    startX = e.clientX;
    startY = e.clientY;
    clear();
    if (opts.onLong) {
      timer = setTimeout(() => {
        longFired = true;
        try {
          navigator.vibrate?.(25);
        } catch {
          /* */
        }
        opts.onLong?.(e);
      }, opts.delay ?? 450);
    }
  }
  function move(e: PointerEvent) {
    if (!active) return;
    if (Math.abs(e.clientX - startX) > 10 || Math.abs(e.clientY - startY) > 10) {
      active = false;
      clear();
    }
  }
  function up() {
    clear();
    // Тап обрабатываем в click: если открыть карточку здесь, браузер следом пришлёт
    // click в ту же точку — уже по затемнению, и карточка сразу закроется.
    tapOk = active && !longFired;
    active = false;
  }
  function click(e: MouseEvent) {
    // клик с клавиатуры (Enter/Space) приходит без pointer-событий — тоже тап
    const fromKeyboard = e.detail === 0;
    if (longFired) {
      e.preventDefault();
      e.stopPropagation();
      longFired = false;
      return;
    }
    if (tapOk || fromKeyboard) opts.onTap?.(e as PointerEvent);
    tapOk = false;
  }
  function cancel() {
    clear();
    active = false;
    tapOk = false;
  }
  /** На тач-экране pointerleave приходит сразу после pointerup — тап при этом не отменяем. */
  function leave() {
    clear();
    active = false;
  }
  function context(e: Event) {
    if (opts.onLong) e.preventDefault();
  }

  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', up);
  node.addEventListener('pointercancel', cancel);
  node.addEventListener('pointerleave', leave);
  node.addEventListener('contextmenu', context);
  node.addEventListener('click', click);

  return {
    update(o) {
      opts = o;
    },
    destroy() {
      clear();
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', cancel);
      node.removeEventListener('pointerleave', leave);
      node.removeEventListener('contextmenu', context);
      node.removeEventListener('click', click);
    },
  };
};
