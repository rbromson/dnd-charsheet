/**
 * Упоминания в тексте хранятся как @[Имя] или @[Имя|як написано] — второе для відмінків:
 * «зустріли @[Мірра|Мірру]» показує «Мірру», а посилання веде на картку «Мірра».
 */
export const MENTION_RE = /@\[([^\]\n|]+)(?:\|([^\]\n]+))?\]/g;
const label = (_: string, name: string, shown?: string) => shown ?? name;

export function extractMentions(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) out.add(m[1]);
  return [...out];
}

export function hasMention(text: string, name: string): boolean {
  return text.includes(`@[${name}]`) || text.includes(`@[${name}|`);
}

export function renameMentions(text: string, oldName: string, newName: string): string {
  if (!oldName || oldName === newName) return text;
  return text.split(`@[${oldName}]`).join(`@[${newName}]`).split(`@[${oldName}|`).join(`@[${newName}|`);
}

/** Фрагмент текста вокруг упоминания (для «Де згадувався»). Упоминания заменены на имена. */
export function snippetAround(text: string, name: string, radius = 60): string {
  let i = text.indexOf(`@[${name}]`);
  if (i < 0) i = text.indexOf(`@[${name}|`);
  if (i < 0) return '';
  const tokenEnd = text.indexOf(']', i) + 1;
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, tokenEnd + radius);
  const raw = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
  return raw.replace(MENTION_RE, label).replace(/\s+/g, ' ');
}

export type TextPart = { kind: 'text'; text: string } | { kind: 'mention'; name: string; label: string };

/** Пробел, который редактор ставит после упоминания, перед знаком препинания не нужен: «Мірра , яка» → «Мірра, яка». */
const PUNCT_AFTER = /^ (?=[,.;:!?)»…])/;

export function splitMentions(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  const pushText = (s: string) => {
    const prev = parts[parts.length - 1];
    parts.push({ kind: 'text', text: prev?.kind === 'mention' ? s.replace(PUNCT_AFTER, '') : s });
  };
  for (const m of text.matchAll(MENTION_RE)) {
    if (m.index! > last) pushText(text.slice(last, m.index));
    parts.push({ kind: 'mention', name: m[1], label: m[2] ?? m[1] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) pushText(text.slice(last));
  return parts;
}

/** Текст с упоминаниями, где @[Имя] заменено на Имя. */
export function mentionsToNames(text: string): string {
  return text.replace(/\] (?=[,.;:!?)»…])/g, ']').replace(MENTION_RE, label);
}

/** Слово запроса подходит к слову имени с учётом окончаний: «Мірру» → «Мірра», «старих шахт» → «Старі шахти». */
export function mentionMatches(name: string, query: string): boolean {
  const n = name.toLowerCase();
  const s = query.trim().toLowerCase();
  if (!s || n.includes(s)) return true;
  const words = n.split(/\s+/);
  return s.split(/\s+/).every((w) => {
    const stem = w.length >= 5 ? w.slice(0, -2) : w.length >= 4 ? w.slice(0, -1) : w;
    return words.some((x) => x.startsWith(stem));
  });
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

/** Заменяет text[start..end) на `@[name] ` (или `@[name|як написали]`) и возвращает новую позицию каретки. */
export function insertMention(text: string, start: number, end: number, name: string, shown = ''): { text: string; caret: number } {
  const sh = sanitizeMentionName(shown).replace(/\|/g, ' ');
  const token = sh && sh !== name ? `@[${name}|${sh}]` : `@[${name}]`;
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
