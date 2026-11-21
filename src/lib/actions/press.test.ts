import { describe, it, expect, vi } from 'vitest';
import { press } from './press';

function setup() {
  const el = document.createElement('button');
  document.body.appendChild(el);
  const onTap = vi.fn();
  const onLong = vi.fn();
  press(el, { onTap, onLong, delay: 50 });
  const pe = (type: string, x = 0, y = 0) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y }));
  const click = () => el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  return { el, onTap, onLong, pe, click };
}

describe('press action', () => {
  it('tap fires on click, not on pointerup (touch order: up, leave, click)', () => {
    const { onTap, pe, click } = setup();
    pe('pointerdown');
    pe('pointerup');
    expect(onTap).not.toHaveBeenCalled();
    pe('pointerleave');
    click();
    expect(onTap).toHaveBeenCalledTimes(1);
  });
  it('long press suppresses the tap', async () => {
    const { onTap, onLong, pe, click } = setup();
    pe('pointerdown');
    await new Promise((r) => setTimeout(r, 80));
    expect(onLong).toHaveBeenCalledTimes(1);
    pe('pointerup');
    click();
    expect(onTap).not.toHaveBeenCalled();
  });
  it('scroll movement cancels the tap', () => {
    const { onTap, pe, click } = setup();
    pe('pointerdown', 0, 0);
    pe('pointermove', 0, 40);
    pe('pointerup', 0, 40);
    click();
    expect(onTap).not.toHaveBeenCalled();
  });
  it('keyboard click taps', () => {
    const { el, onTap } = setup();
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 }));
    expect(onTap).toHaveBeenCalledTimes(1);
  });
});
