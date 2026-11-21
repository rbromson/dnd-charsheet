/** Упоминания в тексте хранятся как @[Имя]. */
export const MENTION_RE = /@\[([^\]\n]+)\]/g;

export function extractMentions(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) out.add(m[1]);
  return [...out];
}

export function hasMention(text: string, name: string): boolean {
  return text.includes(`@[${name}]`);
}

export function renameMentions(text: string, oldName: string, newName: string): string {
  if (!oldName || oldName === newName) return text;
  return text.split(`@[${oldName}]`).join(`@[${newName}]`);
}

/** Фрагмент текста вокруг упоминания (для «Де згадувався»). Упоминания заменены на имена. */
export function snippetAround(text: string, name: string, radius = 60): string {
  const token = `@[${name}]`;
  const i = text.indexOf(token);
  if (i < 0) return '';
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, i + token.length + radius);
  const raw = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  return raw.replace(MENTION_RE, '$1').replace(/\s+/g, ' ');
}

export type TextPart = { kind: 'text'; text: string } | { kind: 'mention'; name: string };

export function splitMentions(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const m of text.matchAll(MENTION_RE)) {
    if (m.index! > last) parts.push({ kind: 'text', text: text.slice(last, m.index) });
    parts.push({ kind: 'mention', name: m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

/** Текст с упоминаниями, где @[Имя] заменено на Имя. */
export function mentionsToNames(text: string): string {
  return text.replace(MENTION_RE, '$1');
}

/** Имя, пригодное для упоминания: без [ ] и переводов строк. */
export function sanitizeMentionName(name: string): string {
  return name.replace(/[[\]\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const WORD_CHAR = /[\p{L}\p{N}_]/u;

/**
 * Активный «@запрос» перед кареткой (для подсказки упоминаний).
 * `@` должен стоять в начале или после не-буквы; запрос без переводов строк, `[`/`]` и двойных пробелов.
 * Возвращает индекс `@` и текст после него до каретки.
 */
export function findMentionQuery(text: string, caret: number, maxLen = 40): { start: number; query: string } | null {
  for (let i = caret - 1; i >= 0 && caret - i <= maxLen + 1; i--) {
    const ch = text[i];
    if (ch === '\n' || ch === '\r' || ch === '[' || ch === ']') return null;
    if (ch === '@') {
      if (i > 0 && WORD_CHAR.test(text[i - 1])) return null;
      const query = text.slice(i + 1, caret);
      if (/^\s/.test(query) || /\s\s/.test(query)) return null;
      return { start: i, query };
    }
  }
  return null;
}

/** Заменяет text[start..end) на `@[name] ` и возвращает новую позицию каретки. */
export function insertMention(text: string, start: number, end: number, name: string): { text: string; caret: number } {
  const token = `@[${name}]`;
  const rest = text.slice(end);
  const sep = rest.startsWith(' ') ? '' : ' ';
  const out = text.slice(0, start) + token + sep + rest;
  return { text: out, caret: start + token.length + 1 };
}

/** Разбивает текст на части, помечая вхождения needle (без учёта регистра) — для <mark>. */
export function markParts(text: string, needle: string): { text: string; mark: boolean }[] {
  if (!needle) return [{ text, mark: false }];
  const parts: { text: string; mark: boolean }[] = [];
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  let last = 0;
  let i = lower.indexOf(n);
  while (i >= 0) {
    if (i > last) parts.push({ text: text.slice(last, i), mark: false });
    parts.push({ text: text.slice(i, i + n.length), mark: true });
    last = i + n.length;
    i = lower.indexOf(n, last);
  }
  if (last < text.length) parts.push({ text: text.slice(last), mark: false });
  return parts;
}
