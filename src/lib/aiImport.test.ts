import { describe, it, expect } from 'vitest';
import { manifestFromAiText } from './aiImport';

describe('AI answer → new character', () => {
  it('accepts a bare character, a { character } wrapper and a full backup', () => {
    expect(manifestFromAiText('```json\n{"name":"Пип","abilities":{"dex":16}}\n```')?.character.name).toBe('Пип');
    expect(manifestFromAiText('Ось персонаж: {"character":{"name":"Пип"}}')?.character.name).toBe('Пип');
    expect(manifestFromAiText('{"app":"taverna","version":1,"character":{"name":"Пип"},"journal":[]}')?.journal).toEqual([]);
  });
  it('rejects empty objects, errors and garbage', () => {
    expect(manifestFromAiText('{}')).toBeNull();
    expect(manifestFromAiText('{"error":"rate limit"}')).toBeNull();
    expect(manifestFromAiText('просто текст')).toBeNull();
    expect(manifestFromAiText('[1,2,3]')).toBeNull();
    expect(manifestFromAiText('{"app":"taverna","character":{}}')).toBeNull();
  });
});
