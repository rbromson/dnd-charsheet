import { describe, it, expect } from 'vitest';
import { insertDictated } from './dictation.svelte';

describe('insertDictated', () => {
  it('capitalizes at sentence start and adds a space', () => {
    expect(insertDictated('', 0, 0, 'зустріли бруно')).toEqual({ text: 'Зустріли бруно', caret: 14 });
    const r = insertDictated('Перше речення.', 14, 14, 'друге');
    expect(r.text).toBe('Перше речення. Друге');
  });
  it('continues mid-sentence without capital', () => {
    expect(insertDictated('Ми пішли', 8, 8, 'до таверни').text).toBe('Ми пішли до таверни');
  });
  it('inserts in the middle with spacing', () => {
    const r = insertDictated('Ми таверни', 2, 2, 'пішли до');
    expect(r.text).toBe('Ми пішли до таверни');
    expect(r.caret).toBe(11);
  });
});
