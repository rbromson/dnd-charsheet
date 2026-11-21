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
