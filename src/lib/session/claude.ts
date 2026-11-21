/**
 * Текст для Claude: просьба о конспекте + известные имена + расшифровка.
 * Чистые функции (тест — claude.test.ts). Отправка — в share.ts.
 */
import type { CodexKind, JournalEntry, TranscriptSegment } from '../model/types';

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

export function buildClaudeText(
  entry: Pick<JournalEntry, 'title' | 'sessionNo' | 'date' | 'transcript'>,
  segments: TranscriptSegment[],
  codexNames: CodexNames,
  characterName: string,
): string {
  const continuation = entry.transcript.some((s) => s.sentToClaude) && segments.some((s) => !s.sentToClaude);
  const sessionBits = [
    entry.sessionNo != null ? `сесія №${entry.sessionNo}` : '',
    entry.title.trim() ? `«${entry.title.trim()}»` : '',
    entry.date ? formatDate(entry.date) : '',
  ].filter(Boolean);
  const who = characterName.trim() ? `Мій персонаж — ${characterName.trim()}.` : '';

  const lines: string[] = [];
  lines.push(
    `Це автоматична розшифровка ${continuation ? 'наступної частини ' : ''}нашої гри в D&D` +
      (sessionBits.length ? ` (${sessionBits.join(', ')})` : '') +
      `. ${who}`.trimEnd(),
  );
  lines.push(
    'Розпізнавання мовлення з помилками: говорять кілька людей одночасно, слова й імена можуть бути перекручені, репліки не підписані.',
  );
  if (continuation) lines.push('Попередні частини цієї сесії я вже надсилав — продовжуй з того місця.');
  lines.push('');
  lines.push('Напиши українською стислий конспект для мого журналу пригод:');
  lines.push('— ключові події по порядку;');
  lines.push('— NPC, місця та завдання, які з’явилися або змінилися (що про них дізналися);');
  lines.push('— відкриті питання, зачіпки, обіцянки й борги;');
  lines.push('— що важливо саме для мого персонажа.');
  lines.push(
    'Відомі імена нижче пиши точно так, як у списку (виправляй схожі на слух варіанти), і оформлюй згадки як @[Ім’я]. Не вигадуй того, чого немає в розшифровці; незрозуміле познач «(нерозбірливо)».',
  );

  const kinds: [CodexKind, string][] = [
    ['npc', 'NPC'],
    ['place', 'Місця'],
    ['quest', 'Завдання'],
  ];
  const known = kinds.filter(([k]) => codexNames[k]?.length);
  if (known.length) {
    lines.push('');
    lines.push('Відомі імена:');
    for (const [k, label] of known) lines.push(`${label}: ${codexNames[k].join(', ')}`);
  }

  lines.push('');
  lines.push('Розшифровка:');
  lines.push(transcriptLines(segments));
  return lines.join('\n');
}
