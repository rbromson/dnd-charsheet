/** Інструкція для ШІ: як розкласти нотатки після гри в «оновлення персонажа» (формат — src/lib/update.ts). */
import type { Character, CodexEntry } from './model/types';
import { lang, type Lang } from './i18n';
import { todayDate } from './model/ids';

const FORMAT = `{
  "taverna": "update",
  "version": 1,
  "journal": { "title": "…", "sessionNo": null, "date": "YYYY-MM-DD", "text": "…", "mode": "append" },
  "items": [ { "action": "add", "name": "…", "qty": 1, "text": "…", "magic": false, "mode": "append" } ],
  "coins": { "cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0 },
  "xp": 0,
  "hp": null,
  "codex": [ { "kind": "npc", "name": "…", "text": "…", "status": "", "mode": "append" } ],
  "notes": []
}`;

const T: Record<Lang, { intro: string; rules: string[]; ctx: string; inv: string; coins: string; known: Record<string, string>; empty: string; voice: string; transcript: string }> = {
  uk: {
    intro: 'Ти допомагаєш мені вести аркуш персонажа D&D. Після гри я надиктовую нотатки. Розклади їх по категоріях і поверни ЛИШЕ JSON у такому форматі (без пояснень, без тексту навколо):',
    rules: [
      'ПОСИЛАННЯ — СКРІЗЬ. У будь-якому тексті (journal.text, codex[].text, items[].text, notes) кожну згадку NPC, місця, завдання чи іншої сутності довідника пиши як @[Ім’я]. Це стосується й описів самих NPC, місць і завдань: якщо NPC пов’язаний з іншим NPC, місцем чи завданням, якщо завдання дав хтось або воно веде кудись, якщо предмет від когось — став посилання. У дужках ім’я в називному відмінку ТОЧНО як у довіднику нижче (або як ти назвав новий запис), а речення будуй так, щоб воно читалося з цією формою: «зустріли корчмарку @[Мірра]», «доручення від @[Мірра]», «дорога до @[Бегафен]». Якщо згадуєш когось чи щось, чого ще немає в довіднику, обов’язково додай для нього запис у codex — інакше посилання нікуди не веде.',
      'journal.text — стислий опис подій сесії українською, від першої особи, по порядку (з посиланнями, див. правило 1).',
      'journal.date — дата гри, якщо я її назвав, інакше {today}. sessionNo — номер сесії, якщо я його назвав, інакше null.',
      'items — зміни спорядження: action "add" (знайшов, купив, отримав), "remove" (продав, втратив, використав, віддав) або "set" (точна кількість). qty — скільки. Для наявних предметів пиши назву ТОЧНО як у списку нижче. magic: true для чарівних. text — що відомо про предмет (властивості, звідки).',
      'coins — ЗМІНА монет за сесію: додатне — отримав, від’ємне — витратив. cp мідні, sp срібні, ep електрум, gp золоті, pp платинові.',
      'xp — скільки досвіду отримано (0, якщо не казав). hp — мої поточні ОЗ наприкінці, якщо я їх назвав, інакше null.',
      'codex — нові або оновлені NPC (kind "npc"), місця ("place") і завдання ("quest"). text — що про них дізналися саме зараз, з посиланнями на пов’язаних NPC, місця й завдання. status — коротко, напр. «живий», «ворог», «активне», «виконане», або "". Для відомих — ім’я ТОЧНО як у списку нижче.',
      'mode — як записати text у вже наявний запис (довідник, предмет, сесію з тим самим номером): "append" — text містить ЛИШЕ нове, воно допишеться окремим абзацом (не повторюй те, що вже відомо); "replace" — text є ПОВНИМ новим описом і замінить старий (коли старе застаріло або треба переписати начисто). За замовчуванням — "append". Для нових записів mode не важливий.',
      'Щоб доповнити наявну сесію, вкажи її sessionNo; інакше створиться нова. Щоб лише оновити опис наявного предмета, не змінюючи кількість, — action "add" з qty 0.',
      'notes — усе, що не лягло в категорії або в чому ти не впевнений (нерозбірливо, суперечливо).',
      'Не вигадуй того, чого я не казав. Порожні категорії залиш порожніми ([] або 0).',
    ],
    ctx: 'Мій персонаж: {name} ({cls}, рівень {lvl}).',
    inv: 'Поточне спорядження',
    coins: 'Монети зараз',
    known: { npc: 'Відомі NPC', place: 'Відомі місця', quest: 'Відомі завдання' },
    empty: 'немає',
    voice: 'Мої нотатки — у голосовому записі, який я надсилаю разом із цим текстом. Розшифруй його і заповни JSON.',
    transcript: 'Мої нотатки (автоматична розшифровка голосу, можливі помилки в словах і іменах):',
  },
  en: {
    intro: 'You help me keep my D&D character sheet. After a game I dictate notes. Sort them into categories and return ONLY JSON in this format (no explanations, no surrounding text):',
    rules: [
      'LINKS EVERYWHERE. In any text (journal.text, codex[].text, items[].text, notes) write every mention of an NPC, place, quest or other codex entity as @[Name]. This includes the descriptions of NPCs, places and quests themselves: if an NPC is connected to another NPC, place or quest, if a quest was given by someone or leads somewhere, if an item came from someone — link them. Inside the brackets use the base form of the name EXACTLY as in the codex below (or as you named a new entry). If you mention someone or something that is not in the codex yet, you MUST add a codex entry for it — otherwise the link leads nowhere.',
      'journal.text — a concise account of the session in English, first person, in order (with links, see rule 1).',
      'journal.date — the game date if I said it, otherwise {today}. sessionNo — the session number if I said it, otherwise null.',
      'items — gear changes: action "add" (found, bought, received), "remove" (sold, lost, used up, gave away) or "set" (exact quantity). qty — how many. For items I already have, use the name EXACTLY as in the list below. magic: true for magic items. text — what is known about the item.',
      'coins — the CHANGE in coins this session: positive — gained, negative — spent. cp, sp, ep, gp, pp.',
      'xp — experience gained (0 if not mentioned). hp — my current hit points at the end if I said them, otherwise null.',
      'codex — new or updated NPCs (kind "npc"), places ("place") and quests ("quest"). text — what we learned about them now, with links to related NPCs, places and quests. status — short, e.g. “alive”, “enemy”, “active”, “done”, or "". For known ones use the name EXACTLY as listed below.',
      'mode — how to write text into an existing entry (codex, item, a session with the same number): "append" — text contains ONLY what is new, added as a separate paragraph (do not repeat what is already known); "replace" — text is the FULL new description replacing the old one (when the old one is outdated or needs a clean rewrite). Default is "append". For new entries mode does not matter.',
      'To add to an existing session, give its sessionNo; otherwise a new one is created. To only update an existing item’s description without changing quantity, use action "add" with qty 0.',
      'notes — anything that does not fit or that you are unsure about (inaudible, contradictory).',
      'Do not invent anything I did not say. Leave empty categories empty ([] or 0).',
    ],
    ctx: 'My character: {name} ({cls}, level {lvl}).',
    inv: 'Current equipment',
    coins: 'Coins now',
    known: { npc: 'Known NPCs', place: 'Known places', quest: 'Known quests' },
    empty: 'none',
    voice: 'My notes are in the voice recording I am sending together with this text. Transcribe it and fill in the JSON.',
    transcript: 'My notes (automatic speech transcript, words and names may be garbled):',
  },
};

/**
 * Полный текст для ШІ. transcript — уже распознанные нотатки; без него — просьба расшифровать приложенную запись.
 * history — блок «що вже відомо» (довідник + журнал), см. historyForPrompt.
 */
export function buildUpdatePrompt(c: Character, codex: CodexEntry[], transcript = '', language: Lang = lang, history = ''): string {
  const L = T[language];
  const lines: string[] = [L.intro, '', FORMAT, ''];
  L.rules.forEach((r, i) => lines.push(`${i + 1}. ${r.replace('{today}', todayDate())}`));
  lines.push('');
  lines.push(L.ctx.replace('{name}', c.name || '—').replace('{cls}', c.className || '—').replace('{lvl}', String(c.level)));
  const inv = c.equipment.map((i) => `${i.name}${i.qty !== 1 ? ` ×${i.qty}` : ''}`);
  lines.push(`${L.inv}: ${inv.length ? inv.join('; ') : L.empty}.`);
  const coins = (['pp', 'gp', 'ep', 'sp', 'cp'] as const).filter((k) => c.coins[k]).map((k) => `${c.coins[k]} ${k}`);
  lines.push(`${L.coins}: ${coins.length ? coins.join(', ') : '0'}.`);
  for (const kind of ['npc', 'place', 'quest'] as const) {
    const names = codex.filter((x) => x.kind === kind).map((x) => x.name);
    if (names.length) lines.push(`${L.known[kind]}: ${names.join(', ')}.`);
  }
  if (history.trim()) lines.push('', history.trim());
  lines.push('');
  if (transcript.trim()) {
    lines.push(L.transcript);
    lines.push(transcript.trim());
  } else lines.push(L.voice);
  return lines.join('\n');
}
