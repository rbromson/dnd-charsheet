import { describe, it, expect } from 'vitest';
import { buildClaudeText, unsentSegments, transcriptLines, clock } from './claude';
import { cleanTranscript } from './text';
import type { TranscriptSegment } from '../model/types';

function seg(at: Date, text: string, sent = false): TranscriptSegment {
  return { id: at.toISOString(), at: at.toISOString(), durationMs: 1000, text, audioId: null, status: 'done', sentToClaude: sent };
}
const d = (h: number, m: number) => new Date(2026, 10, 21, h, m, 5);

describe('claude text', () => {
  const transcript = [seg(d(19, 40), 'Старе', true), seg(d(19, 42), 'Бруно щось знає про печатку'), seg(d(19, 45), ''), seg(d(19, 43), 'Йдемо до архіву')];
  const entry = { title: 'Печатка у підвалі', sessionNo: 7, date: '2026-11-21', transcript };

  it('unsentSegments skips sent and empty', () => {
    expect(unsentSegments(entry).map((s) => s.text)).toEqual(['Бруно щось знає про печатку', 'Йдемо до архіву']);
  });

  it('clock and lines are chronological', () => {
    expect(clock(d(9, 5).toISOString())).toBe('09:05');
    expect(transcriptLines(unsentSegments(entry))).toBe('[19:42] Бруно щось знає про печатку\n[19:43] Йдемо до архіву');
  });

  it('builds prompt with names by kind and transcript', () => {
    const text = buildClaudeText(entry, unsentSegments(entry), { npc: ['Бруно', 'Ліла'], place: ['Кривий кухоль'], quest: [] }, 'Фридо Брецель');
    expect(text).toContain('сесія №7');
    expect(text).toContain('«Печатка у підвалі»');
    expect(text).toContain('21.11.2026');
    expect(text).toContain('Мій персонаж — Фридо Брецель.');
    expect(text).toContain('конспект');
    expect(text).toContain('NPC: Бруно, Ліла');
    expect(text).toContain('Місця: Кривий кухоль');
    expect(text).not.toContain('Завдання:');
    expect(text).toContain('наступної частини');
    expect(text.endsWith('[19:42] Бруно щось знає про печатку\n[19:43] Йдемо до архіву')).toBe(true);
    expect(text).not.toContain('Старе');
  });

  it('first send is not marked as continuation; no names block when codex empty', () => {
    const e = { ...entry, transcript: transcript.map((s) => ({ ...s, sentToClaude: false })) };
    const text = buildClaudeText(e, unsentSegments(e), { npc: [], place: [], quest: [] }, '');
    expect(text).not.toContain('наступної частини');
    expect(text).not.toContain('Відомі імена:');
    expect(text).not.toContain('Мій персонаж');
  });
});

describe('cleanTranscript', () => {
  it('drops whisper subtitle hallucinations', () => {
    expect(cleanTranscript('Дякую за перегляд!')).toBe('');
    expect(cleanTranscript(' Субтитры сделал DimaTorzok')).toBe('');
    expect(cleanTranscript('[Музика]')).toBe('');
    expect(cleanTranscript('Йдемо в таверну. Дякую за перегляд!')).toBe('Йдемо в таверну.');
  });
  it('keeps normal speech and collapses loops', () => {
    expect(cleanTranscript('Дякую, Бруно.')).toBe('Дякую, Бруно.');
    expect(cleanTranscript('Так. Так. Так. Йдемо')).toBe('Так. Йдемо');
    expect(cleanTranscript('ні ні ні ні ні ні добре')).toBe('ні добре');
  });
});
