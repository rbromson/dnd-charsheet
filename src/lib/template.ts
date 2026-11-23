/**
 * Шаблон персонажа для заполнения внешним ИИ (ChatGPT, Claude…).
 * Это обычный лист персонажа в JSON + поле `_instructions` с подсказками.
 * Заполненный файл загружается через «Новий персонаж → З файлу» (.json) — лишние поля игнорируются, неверные типы заменяются значениями по умолчанию.
 */
import type { Character } from './model/types';
import { newCharacter } from './model/defaults';
import { SKILLS } from './model/types';
import { lang, t, type Lang } from './i18n';

const TEXT: Record<Lang, { intro: string[]; fields: Record<string, string>; examples: Record<string, unknown> }> = {
  uk: {
    intro: [
      'Це шаблон персонажа для застосунку «Таверна» (лист D&D 5e).',
      'ЗАВДАННЯ ДЛЯ ШІ: заповни цей JSON даними персонажа з доданого листа (PDF, фото чи тексту). Відповідь — лише готовий JSON, без пояснень.',
      'Не змінюй назви ключів і структуру. Числа пиши числами, не рядками. Чого немає в листі — залиш порожнім або за замовчуванням.',
      'Поля, що починаються з «_», застосунок ігнорує — їх можна лишити.',
      'Готовий файл збережи з розширенням .json і завантаж у застосунку: «Новий персонаж» → «З файлу».',
    ],
    fields: {
      'abilities': 'значення характеристик (не модифікатори): str Сила, dex Вправність, con Статура, int Інтелект, wis Мудрість, cha Харизма',
      'saves.*.prof': '1 — є володіння рятунком, 0 — немає',
      'skills.*.prof': '0 — немає, 1 — володіння, 2 — експертиза',
      'skills.*.ability': 'характеристика навички (можна змінити, якщо клас дозволяє кидати навичку через іншу)',
      'skills.*.minD20': 'мінімум на к20 для цієї навички (напр. 10 для «Надійного таланту»), або null',
      'skills (ключі)': SKILLS.map((s) => `${s.key} — ${t(`skill.${s.key}`)}`).join('; '),
      '*.bonus / *.override': 'bonus — додатковий бонус до автоматичного розрахунку; override — точне число, якщо треба вписати вручну (інакше null)',
      'ac': 'клас обладунку числом; acNote — звідки він (напр. «кольчуга + щит»)',
      'speed': 'швидкість текстом, напр. "30" або "30, політ 60"',
      'hp': 'max / current / temp — очки здоров’я',
      'hitDice': 'die — кубик хітів ("d8"), total — кількість (зазвичай = рівень)',
      'attacks': 'атаки: ability — характеристика атаки (str/dex/… або null), prof — є володіння, damage — формула шкоди, де МОД = модифікатор характеристики (напр. "1d8+МОД"), damageType — тип шкоди, save — якщо ціль кидає рятунок замість кидка атаки (напр. "wis"), інакше null',
      'resources': 'ресурси класу (люті, ки, слоти бойового натхнення…): max, current, die (напр. "d6" або null), recharge — "short" (будь-який відпочинок), "long" (лише довгий) або "manual", maxPerRoll — скільки за один кидок або null',
      'spellcasting': 'enabled — чи є заклинання; ability — характеристика заклинань; slots — масив з 10 елементів, індекс = рівень комірки (0 не використовується), total — скільки комірок',
      'spells': 'заклинання: level 0–9 (0 — заговір), prepared — підготовлене, text — короткий опис',
      'equipment': 'предмети: name, qty, text (опис), magic — чарівний',
      'coins': 'cp мідні, sp срібні, ep електрум, gp золоті, pp платинові',
      'features': 'уміння та риси класу/раси/передісторії: name + text',
      'rules.rerollOnes': 'true, якщо персонаж перекидає одиниці на к20 (напр. «Везучий» напіврослика)',
      'xpNext': 'досвід до наступного рівня (для смужки), можна 0',
    },
    examples: {
      attack: { name: 'Довгий меч', ability: 'str', prof: true, bonus: 0, override: null, damage: '1d8+МОД', damageType: 'рубана', note: 'універсальна (1к10)', save: null, saveDc: null },
      resource: { name: 'Лють', max: 3, current: 3, die: null, recharge: 'long', maxPerRoll: null },
      spell: { level: 1, name: 'Чарівна стріла', prepared: true, text: '3 дротики по 1к4+1 силової шкоди' },
      item: { name: 'Кольчуга', qty: 1, text: 'КО 16, перешкода на Скритність', magic: false },
      feature: { name: 'Атака з переваги', text: 'Раз за хід +1к6 шкоди…' },
    },
  },
  en: {
    intro: [
      'This is a character template for the “Taverna” app (a D&D 5e character sheet).',
      'TASK FOR THE AI: fill this JSON with the character from the attached sheet (PDF, photo or text). Reply with the finished JSON only, no explanations.',
      'Do not rename keys or change the structure. Write numbers as numbers, not strings. Leave anything missing empty or at its default.',
      'Keys starting with “_” are ignored by the app — you may keep them.',
      'Save the result with a .json extension and load it in the app: “New character” → “From file”.',
    ],
    fields: {
      'abilities': 'ability scores (not modifiers): str, dex, con, int, wis, cha',
      'saves.*.prof': '1 — proficient in this saving throw, 0 — not',
      'skills.*.prof': '0 — none, 1 — proficient, 2 — expertise',
      'skills.*.ability': 'ability used by the skill (change it if a feature lets you use another one)',
      'skills.*.minD20': 'minimum d20 roll for this skill (e.g. 10 for Reliable Talent), or null',
      'skills (keys)': SKILLS.map((s) => s.key).join(', '),
      '*.bonus / *.override': 'bonus — extra bonus on top of the automatic value; override — exact number to force (otherwise null)',
      'ac': 'Armor Class as a number; acNote — where it comes from (e.g. “chain mail + shield”)',
      'speed': 'speed as text, e.g. "30" or "30, fly 60"',
      'hp': 'max / current / temp hit points',
      'hitDice': 'die — hit die ("d8"), total — how many (usually = level)',
      'attacks': 'attacks: ability — attack ability (str/dex/… or null), prof — proficient, damage — damage formula where MOD = ability modifier (e.g. "1d8+MOD"), damageType, save — if the target makes a saving throw instead of an attack roll (e.g. "wis"), otherwise null',
      'resources': 'class resources (rage, ki, superiority dice…): max, current, die (e.g. "d6" or null), recharge — "short" (any rest), "long" (long rest only) or "manual", maxPerRoll — how many per roll or null',
      'spellcasting': 'enabled — has spells; ability — spellcasting ability; slots — array of 10, index = slot level (0 unused), total — number of slots',
      'spells': 'spells: level 0–9 (0 = cantrip), prepared, text — short description',
      'equipment': 'items: name, qty, text (description), magic',
      'coins': 'cp, sp, ep, gp, pp',
      'features': 'class/race/background features: name + text',
      'rules.rerollOnes': 'true if the character rerolls 1s on d20 (e.g. Halfling Lucky)',
      'xpNext': 'XP needed for the next level (for the bar), may be 0',
    },
    examples: {
      attack: { name: 'Longsword', ability: 'str', prof: true, bonus: 0, override: null, damage: '1d8+MOD', damageType: 'slashing', note: 'versatile (1d10)', save: null, saveDc: null },
      resource: { name: 'Rage', max: 3, current: 3, die: null, recharge: 'long', maxPerRoll: null },
      spell: { level: 1, name: 'Magic Missile', prepared: true, text: '3 darts, 1d4+1 force each' },
      item: { name: 'Chain mail', qty: 1, text: 'AC 16, disadvantage on Stealth', magic: false },
      feature: { name: 'Sneak Attack', text: 'Once per turn +1d6 damage…' },
    },
  },
};

/** Объект шаблона: инструкции + пустой лист со всеми полями. */
export function buildTemplate(language: Lang = lang): Record<string, unknown> {
  const c: Partial<Character> = newCharacter();
  delete c.id;
  delete c.createdAt;
  delete c.updatedAt;
  delete c.portraitId;
  delete c.gallery;
  const L = TEXT[language];
  return {
    _instructions: L.intro,
    _fields: L.fields,
    _examples: L.examples,
    ...c,
  };
}

const CREATE_TAIL: Record<Lang, string[]> = {
  uk: [
    'До цього повідомлення я додаю свій лист персонажа (PDF, фото чи текст).',
    'Твою відповідь я вставлю прямо в застосунок, тож відповідай лише готовим JSON (можна в блоці коду).',
    'Шаблон для заповнення:',
  ],
  en: [
    'I am attaching my character sheet to this message (PDF, photo or text).',
    'I will paste your answer straight into the app, so reply with the finished JSON only (a code block is fine).',
    'Template to fill:',
  ],
};

/** Текст для «Новий персонаж → Через ШІ»: инструкция + шаблон, ответ вставляется в приложение. */
export function buildCreatePrompt(language: Lang = lang): string {
  const { _instructions, ...rest } = buildTemplate(language);
  const intro = (_instructions as string[]).slice(0, 4);
  return [...intro, '', ...CREATE_TAIL[language], '', JSON.stringify(rest, null, 1)].join('\n');
}

export function templateFile(language: Lang = lang): { blob: Blob; name: string } {
  const json = JSON.stringify(buildTemplate(language), null, 2);
  return {
    blob: new Blob([json], { type: 'application/json' }),
    name: language === 'en' ? 'taverna-character-template.json' : 'taverna-shablon-personazha.json',
  };
}

/** Отдать файл: «Поделиться» на телефоне, иначе скачать. */
export async function deliverFile(blob: Blob, name: string): Promise<void> {
  const file = new File([blob], name, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
