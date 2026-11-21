/**
 * Строки интерфейса. Каждый раздел держит свой файл в ./uk/<раздел>.ts:
 *   export default { 'sheet.title': 'Аркуш', ... } satisfies Record<string, string>;
 * Ключи — с префиксом раздела. Параметры: t('x.count', { n: 3 }) для строки 'Усього {n}'.
 * Чтобы добавить язык: папка ./en/ с теми же ключами и выбор в `lang`.
 */
const modules = import.meta.glob<{ default: Record<string, string> }>('./uk/*.ts', { eager: true });

const dict: Record<string, string> = {};
for (const m of Object.values(modules)) Object.assign(dict, m.default);

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
