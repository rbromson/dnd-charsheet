/**
 * Персонаж текстом для ШІ: лист, спорядження, довідник і журнал сесій (Markdown).
 * history — только довідник и журнал (для инструкции «ШІ → аркуш», чтобы ИИ не создавал дубликаты).
 */
import type { Character, CodexEntry, JournalEntry } from './model/types';
import { ABILITIES, SKILLS } from './model/types';
import { abilityScore, armorClass, fmt, mod, profBonus, skillBonus, walkSpeed } from './rules/calc';
import { MENTION_RE } from './mentions';
import { lang, t, type Lang } from './i18n';
import { db, byCharacter } from './db';
import { normalizeCharacter } from './model/normalize';

const L: Record<Lang, Record<string, string>> = {
  uk: {
    sheet: 'Аркуш',
    level: 'рівень',
    hp: 'ОЗ',
    ac: 'КО',
    speed: 'Швидкість',
    prof: 'Бонус майстерності',
    skills: 'Навички з володінням',
    attacks: 'Атаки',
    features: 'Уміння та риси',
    spells: 'Заклинання',
    gear: 'Спорядження',
    coins: 'Монети',
    traits: 'Характер',
    backstory: 'Передісторія',
    codex: 'Довідник (уже відомі NPC, місця й завдання)',
    journal: 'Журнал сесій',
    session: 'Сесія',
    note: 'Нотатка',
    none: 'немає',
    historyHead: 'ЩО ВЖЕ ВІДОМО. Не створюй дублікатів: якщо в нотатках ідеться про когось чи щось із цього списку — це той самий запис (навіть якщо ім’я в нотатках звучить трохи інакше), онови його через codex з тією самою назвою. Нові записи — лише для справді нових.',
    npc: 'NPC',
    place: 'Місця',
    quest: 'Завдання',
  },
  en: {
    sheet: 'Sheet',
    level: 'level',
    hp: 'HP',
    ac: 'AC',
    speed: 'Speed',
    prof: 'Proficiency bonus',
    skills: 'Proficient skills',
    attacks: 'Attacks',
    features: 'Features & traits',
    spells: 'Spells',
    gear: 'Equipment',
    coins: 'Coins',
    traits: 'Personality',
    backstory: 'Backstory',
    codex: 'Codex (known NPCs, places and quests)',
    journal: 'Session journal',
    session: 'Session',
    note: 'Note',
    none: 'none',
    historyHead: 'WHAT IS ALREADY KNOWN. Do not create duplicates: if my notes mention someone or something from this list, it is the same entry (even if the name sounds slightly different) — update it via codex using the same name. Create new entries only for genuinely new ones.',
    npc: 'NPCs',
    place: 'Places',
    quest: 'Quests',
  },
};

const plain = (s: string) => s.replace(MENTION_RE, '$1').trim();

/** Довідник и журнал текстом. */
export function historyText(codex: CodexEntry[], journal: JournalEntry[], language: Lang = lang): string {
  const T = L[language];
  const out: string[] = [];
  if (codex.length) {
    out.push(`## ${T.codex}`);
    for (const kind of ['npc', 'place', 'quest'] as const) {
      const list = codex.filter((x) => x.kind === kind).sort((a, b) => a.name.localeCompare(b.name));
      if (!list.length) continue;
      out.push(`### ${T[kind]}`);
      for (const x of list) out.push(`- **${x.name}**${x.status ? ` (${x.status})` : ''}${x.text.trim() ? ` — ${plain(x.text).replace(/\s*\n+\s*/g, ' ')}` : ''}`);
    }
  }
  const entries = journal
    .filter((e) => e.text.trim() || e.title.trim())
    .sort((a, b) => (a.date + a.createdAt).localeCompare(b.date + b.createdAt));
  if (entries.length) {
    out.push('', `## ${T.journal}`);
    for (const e of entries) {
      const head = [e.kind === 'session' ? `${T.session}${e.sessionNo != null ? ` ${e.sessionNo}` : ''}` : T.note, e.date, e.title.trim()].filter(Boolean).join(' · ');
      out.push(`### ${head}`, plain(e.text) || '—', '');
    }
  }
  return out.join('\n').trim();
}

/** Блок истории для инструкции «ШІ → аркуш». Пусто, если истории нет. */
export function historyForPrompt(codex: CodexEntry[], journal: JournalEntry[], language: Lang = lang): string {
  const h = historyText(codex, journal, language);
  return h ? `${L[language].historyHead}\n\n${h}` : '';
}

/** Весь персонаж текстом. */
export function characterDigest(c: Character, codex: CodexEntry[], journal: JournalEntry[], language: Lang = lang): string {
  const T = L[language];
  const out: string[] = [];
  out.push(`# ${c.name || '—'}`);
  out.push([c.race, `${c.className} ${T.level} ${c.level}`.trim(), c.background, c.alignment].filter(Boolean).join(' · '));
  out.push('', `## ${T.sheet}`);
  out.push(ABILITIES.map((a) => `${t(`abilityShort.${a}`)} ${abilityScore(c, a)} (${fmt(mod(c, a))})`).join(', '));
  out.push(`${T.hp} ${c.hp.current}/${c.hp.max}${c.hp.temp ? ` +${c.hp.temp}` : ''} · ${T.ac} ${armorClass(c)} · ${T.speed} ${walkSpeed(c).text} · ${T.prof} ${fmt(profBonus(c))}`);
  const skills = SKILLS.filter((s) => c.skills[s.key].prof > 0).map((s) => `${t(`skill.${s.key}`)} ${fmt(skillBonus(c, s.key))}`);
  out.push(`${T.skills}: ${skills.length ? skills.join(', ') : T.none}`);
  if (c.attacks.length) out.push(`${T.attacks}: ${c.attacks.map((a) => `${a.name} (${a.damage} ${a.damageType})`.trim()).join('; ')}`);
  if (c.resources.length) out.push(c.resources.map((r) => `${r.name} ${r.current}/${r.max}${r.die ? ` ${r.die}` : ''}`).join('; '));
  if (c.features.length) {
    out.push('', `## ${T.features}`);
    for (const f of c.features) out.push(`- **${f.name}** — ${plain(f.text).replace(/\s*\n+\s*/g, ' ')}`);
  }
  if (c.spellcasting.enabled && c.spells.length) {
    out.push('', `## ${T.spells}`);
    out.push(
      [...c.spells]
        .sort((a, b) => a.level - b.level)
        .map((s) => `${s.name} (${s.level})`)
        .join(', '),
    );
  }
  out.push('', `## ${T.gear}`);
  out.push(c.equipment.length ? c.equipment.map((i) => `- ${i.name}${i.qty !== 1 ? ` ×${i.qty}` : ''}${i.text.trim() ? ` — ${plain(i.text).split('\n')[0]}` : ''}`).join('\n') : T.none);
  const coins = (['pp', 'gp', 'ep', 'sp', 'cp'] as const).filter((k) => c.coins[k]).map((k) => `${c.coins[k]} ${k}`);
  out.push(`${T.coins}: ${coins.length ? coins.join(', ') : '0'}`);
  const tr = c.traits;
  const traits = [tr.personality, tr.ideals, tr.bonds, tr.flaws].map((x) => x.trim()).filter(Boolean);
  if (traits.length) out.push('', `## ${T.traits}`, ...traits.map((x) => `- ${x}`));
  if (c.profile.backstory.trim()) out.push('', `## ${T.backstory}`, plain(c.profile.backstory));
  const h = historyText(codex, journal, language);
  if (h) out.push('', h);
  return out.join('\n').trim() + '\n';
}

/** Собрать текст для персонажа из базы (любого, не только открытого). */
export async function digestFor(characterId: string): Promise<{ name: string; text: string }> {
  const c = normalizeCharacter(await (await db()).get('characters', characterId));
  const [codex, journal] = await Promise.all([byCharacter('codex', characterId), byCharacter('journal', characterId)]);
  return { name: c.name, text: characterDigest(c, codex, journal) };
}
