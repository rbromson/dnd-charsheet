import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import NumberField from './NumberField.svelte';

let app: Record<string, unknown> | null = null;
afterEach(() => {
  if (app) unmount(app);
  app = null;
  document.body.innerHTML = '';
});

function type(input: HTMLInputElement, text: string) {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
}

describe('NumberField', () => {
  it('набрані цифри не відкочуються і передаються далі', () => {
    const seen: (number | null)[] = [];
    app = mount(NumberField, { target: document.body, props: { value: 1, min: 1, max: 20, onchange: (v: number | null) => seen.push(v) } });
    flushSync();
    const input = document.querySelector('input')!;
    type(input, '18');
    expect(input.value).toBe('18');
    expect(seen.at(-1)).toBe(18);
  });

  it('проміжне порожнє значення не збиває введення', () => {
    const seen: (number | null)[] = [];
    app = mount(NumberField, { target: document.body, props: { value: 10, min: 0, onchange: (v: number | null) => seen.push(v) } });
    flushSync();
    const input = document.querySelector('input')!;
    type(input, '');
    expect(input.value).toBe('');
    type(input, '1');
    type(input, '15');
    expect(input.value).toBe('15');
    expect(seen.at(-1)).toBe(15);
  });

  it('мінімум не заважає набирати число, а при виході з поля значення вирівнюється', () => {
    const seen: (number | null)[] = [];
    app = mount(NumberField, { target: document.body, props: { value: 10, min: 10, max: 99, onchange: (v: number | null) => seen.push(v) } });
    flushSync();
    const input = document.querySelector('input')!;
    input.dispatchEvent(new FocusEvent('focus'));
    type(input, '3');
    expect(input.value).toBe('3');
    type(input, '35');
    expect(input.value).toBe('35');
    expect(seen.at(-1)).toBe(35);
    type(input, '5');
    input.dispatchEvent(new FocusEvent('blur'));
    flushSync();
    expect(input.value).toBe('10');
    expect(seen.at(-1)).toBe(10);
  });
});
