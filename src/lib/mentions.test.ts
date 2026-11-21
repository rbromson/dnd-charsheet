import { describe, it, expect } from 'vitest';
import {
  extractMentions,
  renameMentions,
  snippetAround,
  splitMentions,
  hasMention,
  mentionsToNames,
  sanitizeMentionName,
  findMentionQuery,
  insertMention,
  markParts,
} from './mentions';

describe('extractMentions', () => {
  it('finds unique names in order, incl. multi-word and Cyrillic', () => {
    const t = '@[Бруно] пішов до @[Кривий кухоль], а @[Бруно] лишився. @[Мадам Ліла]!';
    expect(extractMentions(t)).toEqual(['Бруно', 'Кривий кухоль', 'Мадам Ліла']);
  });
  it('handles adjacent mentions', () => {
    expect(extractMentions('@[А]@[Б]')).toEqual(['А', 'Б']);
  });
  it('ignores bare @ and unclosed brackets', () => {
    expect(extractMentions('пошта @ дім, @Бр, @[без кінця')).toEqual([]);
  });
  it('does not cross line breaks', () => {
    expect(extractMentions('@[Бру\nно]')).toEqual([]);
  });
  it('is reusable (global regex state does not leak)', () => {
    expect(extractMentions('@[X]')).toEqual(['X']);
    expect(extractMentions('@[X]')).toEqual(['X']);
  });
});

describe('hasMention', () => {
  it('matches exact token only', () => {
    expect(hasMention('з @[Бруно] у таверні', 'Бруно')).toBe(true);
    expect(hasMention('з Бруно у таверні', 'Бруно')).toBe(false);
    expect(hasMention('@[Бруно Старший]', 'Бруно')).toBe(false);
  });
});

describe('renameMentions', () => {
  it('renames all occurrences', () => {
    expect(renameMentions('@[Бруно] і @[Бруно]', 'Бруно', 'Бруно Кухар')).toBe('@[Бруно Кухар] і @[Бруно Кухар]');
  });
  it('does not touch plain text or other mentions with a common prefix', () => {
    expect(renameMentions('Бруно, @[Бруно Старший], @[Бруно]', 'Бруно', 'Б')).toBe('Бруно, @[Бруно Старший], @[Б]');
  });
  it('no-op for empty or same name', () => {
    expect(renameMentions('@[А]', '', 'Б')).toBe('@[А]');
    expect(renameMentions('@[А]', 'А', 'А')).toBe('@[А]');
  });
  it('renames adjacent mentions', () => {
    expect(renameMentions('@[А]@[А]', 'А', 'Б')).toBe('@[Б]@[Б]');
  });
});

describe('snippetAround', () => {
  it('returns text around the mention with names unwrapped', () => {
    const s = snippetAround('Сьогодні @[Бруно] нарешті заговорив про борг у @[Кривий кухоль].', 'Бруно', 100);
    expect(s).toBe('Сьогодні Бруно нарешті заговорив про борг у Кривий кухоль.');
  });
  it('adds ellipses when trimmed and collapses whitespace', () => {
    const long = 'а'.repeat(100) + '\n\n@[Ліла]  каже\n' + 'б'.repeat(100);
    const s = snippetAround(long, 'Ліла', 10);
    expect(s.startsWith('…')).toBe(true);
    expect(s.endsWith('…')).toBe(true);
    expect(s).toContain('Ліла каже');
    expect(s).not.toContain('\n');
  });
  it('returns empty string when not mentioned', () => {
    expect(snippetAround('нічого', 'Бруно')).toBe('');
  });
});

describe('splitMentions', () => {
  it('splits text and mentions', () => {
    expect(splitMentions('Привіт, @[Мадам Ліла]! Як @[Бруно]?')).toEqual([
      { kind: 'text', text: 'Привіт, ' },
      { kind: 'mention', name: 'Мадам Ліла' },
      { kind: 'text', text: '! Як ' },
      { kind: 'mention', name: 'Бруно' },
      { kind: 'text', text: '?' },
    ]);
  });
  it('adjacent mentions and mention-only text', () => {
    expect(splitMentions('@[А]@[Б]')).toEqual([
      { kind: 'mention', name: 'А' },
      { kind: 'mention', name: 'Б' },
    ]);
  });
  it('plain text and empty', () => {
    expect(splitMentions('просто текст')).toEqual([{ kind: 'text', text: 'просто текст' }]);
    expect(splitMentions('')).toEqual([]);
  });
  it('keeps newlines in text parts', () => {
    expect(splitMentions('рядок\n@[Х]\nще')).toEqual([
      { kind: 'text', text: 'рядок\n' },
      { kind: 'mention', name: 'Х' },
      { kind: 'text', text: '\nще' },
    ]);
  });
});

describe('mentionsToNames / sanitizeMentionName', () => {
  it('unwraps mentions', () => {
    expect(mentionsToNames('@[Бруно] і @[Кривий кухоль]')).toBe('Бруно і Кривий кухоль');
  });
  it('sanitizes names', () => {
    expect(sanitizeMentionName('  Бру[но]\nСтарший ')).toBe('Бру но Старший');
  });
});

describe('findMentionQuery', () => {
  it('finds @query before caret', () => {
    const t = 'взяти ліхтар і @Бр';
    expect(findMentionQuery(t, t.length)).toEqual({ start: 15, query: 'Бр' });
  });
  it('bare @ gives empty query', () => {
    expect(findMentionQuery('@', 1)).toEqual({ start: 0, query: '' });
  });
  it('allows spaces inside (multi-word names) but not leading/double', () => {
    expect(findMentionQuery('@Кривий к', 9)).toEqual({ start: 0, query: 'Кривий к' });
    expect(findMentionQuery('@ x', 3)).toBeNull();
    expect(findMentionQuery('@a  b', 5)).toBeNull();
  });
  it('ignores emails / @ after a letter', () => {
    expect(findMentionQuery('mail@host', 9)).toBeNull();
  });
  it('stops at newline and at finished mentions', () => {
    expect(findMentionQuery('@Бр\nдалі', 8)).toBeNull();
    const t = '@[Бруно] і далі';
    expect(findMentionQuery(t, t.length)).toBeNull();
  });
  it('respects max length', () => {
    expect(findMentionQuery('@' + 'а'.repeat(50), 51, 40)).toBeNull();
  });
  it('works after punctuation', () => {
    expect(findMentionQuery('(@Лі', 4)).toEqual({ start: 1, query: 'Лі' });
  });
});

describe('insertMention', () => {
  it('replaces @query with token and a space', () => {
    const t = 'бачив @Бр сьогодні';
    const r = insertMention(t, 6, 9, 'Бруно');
    expect(r.text).toBe('бачив @[Бруно] сьогодні');
    expect(r.text.slice(r.caret)).toBe('сьогодні');
  });
  it('adds a space at the end', () => {
    const r = insertMention('@Лі', 0, 3, 'Мадам Ліла');
    expect(r.text).toBe('@[Мадам Ліла] ');
    expect(r.caret).toBe(r.text.length);
  });
});

describe('markParts', () => {
  it('marks case-insensitive occurrences', () => {
    expect(markParts('…бруно сказав Бруно', 'Бруно')).toEqual([
      { text: '…', mark: false },
      { text: 'бруно', mark: true },
      { text: ' сказав ', mark: false },
      { text: 'Бруно', mark: true },
    ]);
  });
  it('no needle → whole text', () => {
    expect(markParts('abc', '')).toEqual([{ text: 'abc', mark: false }]);
  });
});
