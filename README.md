# Таверна — аркуш персонажа

Офлайн-PWA для планшета: лист персонажа для настольных ролевых игр (шаблон D&D 5e, всё переопределяемо под homebrew), кубики с домашними правилами и журнал пригод с записью сессии.

Все данные хранятся только в браузере устройства (IndexedDB). Аккаунтов, сервера и облака нет.

- Svelte 5 + TypeScript + Vite, vite-plugin-pwa
- `npm run dev` — разработка, `npm test` — тесты, `npm run build` — сборка в `dist/`
- Деплой: GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`)

Не связано с Wizards of the Coast; логотипы, арт и тексты правил не используются.
