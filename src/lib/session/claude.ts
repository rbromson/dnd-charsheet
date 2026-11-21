/**
 * Текст для Claude: просьба о конспекте + известные имена + расшифровка.
 * Чистые функции (тест — claude.test.ts). Отправка — в share.ts.
 */
import type { CodexKind, JournalEntry, TranscriptSegment } from '../model/types';
import { lang, type Lang } from '../i18n';

export type CodexNames = Record<CodexKind, string[]>;

/** Фрагменты, которые ещё не уходили в Claude и в которых есть текст. */
export function unsentSegments(entry: Pick<JournalEntry, 'transcript'>): TranscriptSegment[] {
  return entry.transcript.filter((s) => !s.sentToClaude && s.text.trim() !== '');
}

export function segmentsWithText(entry: Pick<JournalEntry, 'transcript'>): TranscriptSegment[] {
  return entry.transcript.filter((s) => s.text.trim() !== '');
}

/** «19:42» по локальному времени */
export function clock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function transcriptLines(segments: TranscriptSegment[]): string {
  return [...segments]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((s) => `[${clock(s.at)}] ${s.text.trim().replace(/\s+/g, ' ')}`)
    .join('\n');
}

function formatDate(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : date;
}

const PROMPT = {
  uk: {
    session: (n: number) => `сесія №${n}`,
    who: (name: string) => `Мій персонаж — ${name}.`,
    intro: (cont: boolean) => `Це автоматична розшифровка ${cont ? 'наступної частини ' : ''}нашої гри в D&D`,
    noisy: 'Розпізнавання мовлення з помилками: говорять кілька людей одночасно, слова й імена можуть бути перекручені, репліки не підписані.',
    cont: 'Попередні частини цієї сесії я вже надсилав — продовжуй з того місця.',
    ask: [
      'Напиши українською стислий конспект для мого журналу пригод:',
      '— ключові події по порядку;',
      '— NPC, місця та завдання, які з’явилися або змінилися (що про них дізналися);',
      '— відкриті питання, зачіпки, обіцянки й борги;',
      '— що важливо саме для мого персонажа.',
      'Відомі імена нижче пиши точно так, як у списку (виправляй схожі на слух варіанти), і оформлюй згадки як @[Ім’я]. Не вигадуй того, чого немає в розшифровці; незрозуміле познач «(нерозбірливо)».',
    ],
    kinds: { npc: 'NPC', place: 'Місця', quest: 'Завдання' } as Record<CodexKind, string>,
    known: 'Відомі імена:',
    transcript: 'Розшифровка:',
    q: (s: string) => `«${s}»`,
  },
  en: {
    session: (n: number) => `session #${n}`,
    who: (name: string) => `My character is ${name}.`,
    intro: (cont: boolean) => `This is an automatic transcript of ${cont ? 'the next part of ' : ''}our D&D game`,
    noisy: 'The speech recognition is noisy: several people talk at once, words and names may be garbled, lines are not attributed.',
    cont: 'I have already sent the earlier parts of this session — continue from there.',
    ask: [
      'Write a concise summary in English for my adventure journal:',
      '— key events in order;',
      '— NPCs, places and quests that appeared or changed (what we learned about them);',
      '— open questions, leads, promises and debts;',
      '— what matters specifically for my character.',
      'Spell the known names below exactly as listed (fix similar-sounding variants) and format mentions as @[Name]. Do not invent anything that is not in the transcript; mark unclear parts as “(inaudible)”.',
    ],
    kinds: { npc: 'NPCs', place: 'Places', quest: 'Quests' } as Record<CodexKind, string>,
    known: 'Known names:',
    transcript: 'Transcript:',
    q: (s: string) => `“${s}”`,
  },
};

export function buildClaudeText(
  entry: Pick<JournalEntry, 'title' | 'sessionNo' | 'date' | 'transcript'>,
  segments: TranscriptSegment[],
  codexNames: CodexNames,
  characterName: string,
  language: Lang = lang,
): string {
  const P = PROMPT[language];
  const continuation = entry.transcript.some((s) => s.sentToClaude) && segments.some((s) => !s.sentToClaude);
  const sessionBits = [
    entry.sessionNo != null ? P.session(entry.sessionNo) : '',
    entry.title.trim() ? P.q(entry.title.trim()) : '',
    entry.date ? formatDate(entry.date) : '',
  ].filter(Boolean);
  const who = characterName.trim() ? P.who(characterName.trim()) : '';

  const lines: string[] = [];
  lines.push(P.intro(continuation) + (sessionBits.length ? ` (${sessionBits.join(', ')})` : '') + `. ${who}`.trimEnd());
  lines.push(P.noisy);
  if (continuation) lines.push(P.cont);
  lines.push('');
  lines.push(...P.ask);

  const kinds: CodexKind[] = ['npc', 'place', 'quest'];
  const known = kinds.filter((k) => codexNames[k]?.length);
  if (known.length) {
    lines.push('');
    lines.push(P.known);
    for (const k of known) lines.push(`${P.kinds[k]}: ${codexNames[k].join(', ')}`);
  }

  lines.push('');
  lines.push(P.transcript);
  lines.push(transcriptLines(segments));
  return lines.join('\n');
}
