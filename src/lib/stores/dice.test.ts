import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { dice } from './dice.svelte';

describe('бросок в два шага', () => {
  beforeEach(() => {
    dice.cancelPending();
    dice.close();
  });

  it('askCheck только готовит бросок, ничего не кидая', () => {
    const before = dice.history.length;
    dice.mode = 'adv';
    dice.askCheck({ kind: 'skill', label: 'Обман', bonus: 9 });
    expect(dice.pending?.req.label).toBe('Обман');
    expect(dice.mode).toBe('normal');
    expect(dice.history.length).toBe(before);
    expect(dice.overlayOpen).toBe(false);
  });

  it('confirmPending кидает с выбранным режимом и вызывает after', () => {
    let seen = '';
    dice.askCheck({ kind: 'skill', label: 'Обман', bonus: 9 }, (e) => (seen = e.label));
    dice.mode = 'dis';
    const e = dice.confirmPending();
    expect(e?.type).toBe('d20');
    if (e?.type === 'd20') {
      expect(e.roll.mode).toBe('dis');
      expect(e.roll.dice.length).toBe(2);
    }
    expect(seen).toBe('Обман');
    expect(dice.pending).toBeNull();
    expect(dice.overlayOpen).toBe(true);
    expect(dice.mode).toBe('normal');
  });

  it('cancelPending отменяет без броска', () => {
    const before = dice.history.length;
    dice.askCheck({ kind: 'init', label: 'Ініціатива', bonus: 2 });
    dice.mode = 'adv';
    dice.cancelPending();
    expect(dice.pending).toBeNull();
    expect(dice.mode).toBe('normal');
    expect(dice.history.length).toBe(before);
    expect(dice.confirmPending()).toBeNull();
  });
});
