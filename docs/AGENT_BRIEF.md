# Памятка для исполнителей (общая)

Проект: офлайн-PWA «Таверна» — лист персонажа D&D 5e (homebrew-friendly) + журнал. Svelte 5 (runes!) + TypeScript + Vite. Планшет Redmi Pad 2 Pro: ~1280×800 css px в альбомной, ~800×1280 в книжной; управление пальцем во время игры.

Прочитай перед работой:
- `docs/superpowers/specs/2026-11-21-taverna-charsheet-design.md` — что строим (особенно «Полный перечень действий» и «Расчёты»).
- `src/lib/model/types.ts` — модель данных (контракт, НЕ меняй без крайней нужды; если нужно поле — сообщи в отчёте).
- `src/styles/theme.css` — токены и общие классы (`.card`, `.panel`, `.btn btn-primary|btn-ink|btn-outline|btn-danger|btn-good|btn-ghost`, `.field`, `.label`, `.chip(.on)`, `.tag`, `.num`, `.serif`, `.sc`, `.muted`, `.view`, `.cols cols-2|cols-3`, `.stack`, `.row`, `.grow`, `.empty`, `.card-title`).
- Макет утверждённой концепции: `.superpowers/brainstorm/85953-1795278098/content/visual-concept-v2.html` (открой как текст и смотри разметку/стили нужного экрана — это эталон вида).

## Правила

1. **Svelte 5 runes**: `$props`, `$state`, `$derived`, `$effect`, `$bindable`, `onclick=` (не `on:click`), сниппеты вместо слотов. Не используй устаревший синтаксис Svelte 4.
2. **Строки** только через `t('ключ')` из `src/lib/i18n`. Свои строки клади в СВОЙ файл `src/lib/i18n/uk/<раздел>.ts` в формате `export default { 'раздел.ключ': 'Текст' } satisfies Record<string, string>;`. Уже есть `common.ts` (nav, mode, common.*, ability.*, abilityShort.*, skill.*, chars.*) — используй, не дублируй. Язык интерфейса — украинский; подписи как в официальном PDF (Клас обладунку, Ініціатива, Швидкість, Кидки рятунку, Навички, Натхнення, Бонус майстерності, Пасивна мудрість (уважність), Поточне здоров'я, Тимчасове здоров'я, Кубики здоров'я, Рятунок від смерті (успіхи/провали), Атаки та заклинання, Інші володіння та знання мов, Спорядження, ММ/СМ/ЕМ/ЗМ/ПМ, Уміння та особливості, Риси характеру, Ідеали, Прив'язаності, Слабкості, Вік, Зріст, Вага, Очі, Шкіра, Волосся, Зовнішність персонажа, Передісторія персонажа, Союзники та організації, Інші уміння та особливості, Скарби, Клас заклинателя, Базова характеристика, СК рятунку від заклинань, Бонус атаки заклинань, Заговори, Рівень заклинань, Усього слотів, Витрачено слотів, Підготовлено, Назва заклинання).
3. **Зоны касания ≥ 48 px** (`var(--tap)`).
4. **Цвета** только CSS-переменные из theme.css. Акцент `--ember`; `--gold` — только успех (нат. 20, закреплённое).
5. **Два режима**: `ui.mode === 'play'` (тап = бросок / живое изменение; долгий тап = карточка настроек) и `'edit'` (`ui.editing`): поля редактируемые, у списков добавить/удалить/переместить (`RowActions`, `move()` из `src/lib/list.ts`). Тап/долгий тап — action `use:press={{ onTap, onLong }}` из `src/lib/actions/press.ts`.
6. **Данные**:
   - Лист: `charStore.current` (`src/lib/stores/characters.svelte.ts`) — реактивный `$state`; можно `bind:value={c.name}` и мутировать напрямую — автосохранение само. Для заметных действий (урон, отдых, трата ресурса, удаление) — `charStore.update(c => {...}, { undo: 'Текст тоста' })`, это даёт кнопку «Скасувати».
   - Журнал `journal`, справочник `codex`, медиа (`putMedia`, `getMediaUrl`, `resizeImage`, `pickFiles`, `deleteMedia` в `src/lib/stores/media.ts`), UI `ui` (`ui.toast`, `ui.openSheet(Component, props)`, `ui.closeSheet()`, `ui.confirm(msg, {danger, okLabel, details})`, `ui.tab`, `ui.go(tab)`, `ui.journalFocus`), кубики `dice` (`dice.rollCheck({label, bonus, kind, minD20?, attackId?, damage?, damageLabel?})`, `dice.rollDamage(label, formula, crit)`, `dice.rollFree(formula)`, `dice.addResourceDie(resourceId)`, `dice.canAddResourceDie(id)`, `dice.rollDeathSave(label)`, `dice.mode` — normal/adv/dis для следующего броска).
   - Расчёты — ТОЛЬКО из `src/lib/rules/calc.ts` (`abilityMod, profBonus, skillBonus, skillAuto, saveBonus, saveAuto, initiative, initiativeAuto, passivePerception, passivePerceptionAuto, attackBonus, attackAuto, resolveDamageFormula, spellDC, spellDCAuto, spellAttack, spellAttackAuto, fmt`), `rules/hp.ts` (`applyDamage, applyHeal, setTemp`), `rules/rest.ts` (`applyRest, restPreview`). Не дублируй формулы.
7. **Готовые компоненты** (`src/components/`): `TopBar` (заголовок экрана + переключатель Гра/Правка; каждый экран рендерит `<TopBar title=…>` сам, справа можно передать children), `SheetFrame` (оформление боковой карточки: `kicker`, `title`, `value`, children, `footer`), `NumberField` (`bind:value`, `nullable` для «вручну», `big`), `TextField` (`bind:value`, `multiline`, `serif`), `Stepper`, `Segmented`, `Toggle`, `TweakEditor` (доп. бонус + вручну для `Tweak`), `Portrait`, `MediaImage`, `RowActions`, `Icon` (имена в `ICONS`; можешь ДОБАВИТЬ иконку точечной правкой Edit в `ICONS`, не переписывай файл).
8. Боковые карточки настроек — отдельные компоненты в твоей папке, открываются `ui.openSheet(MySheet, { ...props })`, внутри `<SheetFrame>`. Фон карточки — светлый пергамент (стили полей уже адаптированы).
9. Раскладка: корень экрана `<TopBar …/><div class="view">…</div>`, колонки — `.cols cols-3` (1 колонка < 760 px контента, 2 колонки до 1040, 3 шире). Должно хорошо выглядеть и в 1184 px (альбомная), и в 704 px (книжная).

## Границы

- Меняй ТОЛЬКО файлы своей задачи (список в задании). Общие файлы (`types.ts`, сторы, theme.css, App.svelte, common.ts, другие экраны) не трогай — если без изменения никак, опиши нужное изменение в отчёте (я внесу). Исключение — точечное добавление иконок в `ICONS`.
- Параллельно работают другие исполнители в этой же папке. Не запускай `git commit`, `git stash`, `git checkout`, не форматируй чужие файлы, не запускай `npm install`, не открывай браузер.
- Проверка: `npx svelte-check --tsconfig ./tsconfig.json 2>&1 | grep -E "<твоя папка>"` — у твоих файлов должно быть 0 ошибок и предупреждений (ошибки в чужих файлах игнорируй). Если пишешь чистую логику — тест рядом `*.test.ts` и `npx vitest run <путь>`.
- В отчёте: список файлов, что сделано, что не сделано/под вопросом, какие изменения в общих файлах нужны (точно: файл, что добавить).
