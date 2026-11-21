# Таверна — аркуш персонажа

Офлайн-PWA для планшета: лист персонажа для настольных ролевых игр (шаблон D&D 5e, всё переопределяемо под homebrew), кубики с домашними правилами и журнал пригод с записью сессии.

Все данные хранятся только в браузере устройства (IndexedDB). Аккаунтов, сервера и облака нет.

- Svelte 5 + TypeScript + Vite, vite-plugin-pwa
- `npm run dev` — разработка, `npm test` — тесты, `npm run build` — сборка в `dist/`
- Деплой: GitHub Actions → GitHub Pages (`.github/workflows/deploy.yml`)

Не связано с Wizards of the Coast; логотипы и арт не используются.

Библиотека предметов и заклинаний — материалы System Reference Document 5.1 © Wizards of the Coast LLC,
лицензия [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode); структурированные данные — проект
[5e-bits/5e-database](https://github.com/5e-bits/5e-database); перевод на украинский сделан для этого приложения.
Сборка: `python3 -I scripts/build-library.py <raw> <переводы> src/lib/library/data`.
