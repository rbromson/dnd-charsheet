/**
 * Строки интерфейса. Каждый раздел держит свой файл в ./uk/<раздел>.ts (и перевод в ./en/<раздел>.ts):
 *   export default { 'sheet.title': 'Аркуш', ... } satisfies Record<string, string>;
 * Ключи — с префиксом раздела. Параметры: t('x.count', { n: 3 }) для строки 'Усього {n}'.
 * Язык выбирается один раз при загрузке (localStorage) — смена языка перезагружает страницу.
 */
export type Lang = 'uk' | 'en';
const LS_KEY = 'taverna.lang';

function readLang(): Lang {
  try {
    return globalThis.localStorage?.getItem(LS_KEY) === 'en' ? 'en' : 'uk';
  } catch {
    return 'uk';
  }
}

export const lang: Lang = readLang();

const uk = import.meta.glob<{ default: Record<string, string> }>('./uk/*.ts', { eager: true });
const en = import.meta.glob<{ default: Record<string, string> }>('./en/*.ts', { eager: true });

const dict: Record<string, string> = {};
for (const m of Object.values(uk)) Object.assign(dict, m.default);
// недостающие английские строки остаются украинскими
if (lang === 'en') for (const m of Object.values(en)) Object.assign(dict, m.default);

export function t(key: string, params?: Record<string, string | number>): string {
  let s = dict[key];
  if (s === undefined) {
    if (import.meta.env.DEV) console.warn('[i18n] missing key', key);
    return key;
  }
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function has(key: string): boolean {
  return key in dict;
}

/** Сменить язык интерфейса (перезагружает страницу). */
export function setLang(l: Lang): void {
  try {
    localStorage.setItem(LS_KEY, l);
  } catch {
    /* приватный режим — останется язык по умолчанию */
  }
  location.reload();
}

/** Кубики в тексте: «1к8» по-украински, «1d8» по-английски. */
export const dieText = (s: string): string => (lang === 'uk' ? s.replace(/(\d*)d(\d)/g, '$1к$2') : s);

/** Слово-заглушка модификатора в формулах урона. */
export const MOD_WORD = lang === 'en' ? 'MOD' : 'МОД';
