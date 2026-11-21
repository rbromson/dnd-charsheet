/**
 * Очистка текста распознавания. Whisper на тишине/шуме «галлюцинирует» титрами
 * («Дякую за перегляд!», «Субтитры сделал …»); такие фразы выкидываем,
 * повторы одной фразы схлопываем.
 */

const JUNK_WHOLE = [
  'дякую за перегляд',
  'дякую за увагу',
  'спасибо за просмотр',
  'спасибо за внимание',
  'продолжение следует',
  'продовження буде',
  'thank you for watching',
  'thanks for watching',
  'підписуйтесь на канал',
  'подписывайтесь на канал',
  'ставте лайки',
];

const JUNK_FRAGMENT = [/amara\.org/i, /dimatorzok/i, /субтитр/i, /редактор субтитров/i, /корректор/i];

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.]/gu, ' ')
    .replace(/[.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanTranscript(raw: string): string {
  let s = raw
    // служебные метки: [Музика], (музыка), *music*, [BLANK_AUDIO]
    .replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|♪+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';

  // делим на предложения, убираем мусорные и подряд идущие повторы
  const sentences = s.match(/[^.!?…]+[.!?…]*/g) ?? [s];
  const out: string[] = [];
  let prev = '';
  for (const raw of sentences) {
    const sent = raw.trim();
    const n = norm(sent);
    if (!n) continue;
    if (JUNK_FRAGMENT.some((re) => re.test(sent)) || JUNK_WHOLE.includes(n)) continue;
    if (n === prev) continue;
    out.push(sent);
    prev = n;
  }
  s = out.join(' ').trim();
  if (JUNK_WHOLE.includes(norm(s))) return '';
  // «слово слово слово слово …» — зацикливание декодера
  s = s.replace(/(?<![\p{L}\p{N}])([\p{L}\p{N}'’-]+)(?:[\s,]+\1(?![\p{L}\p{N}])){3,}/giu, '$1');
  return s;
}
