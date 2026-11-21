# «Таверна» PWA — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Рабочий офлайн-PWA «лист персонажа + журнал с записью сессии» на GitHub Pages к завтрашней игре.

**Architecture:** Svelte 5 (runes) SPA. Чистая логика (`src/lib/model`, `rules`, `dice`, `session/vad`) покрыта Vitest. Состояние — модули `*.svelte.ts` с `$state`, автосохранение в IndexedDB с дебаунсом 400 мс. Экраны — `src/views/<раздел>/`, общие компоненты — `src/components/`.

**Tech Stack:** svelte 5.59, vite 8, @sveltejs/vite-plugin-svelte 7, vite-plugin-pwa 2, vitest 5 + jsdom + fake-indexeddb, typescript 5.9, idb 8, fflate 0.8, @huggingface/transformers 4 (лениво, в воркере), @fontsource/*.

**Spec:** `docs/superpowers/specs/2026-11-21-taverna-charsheet-design.md`

## Global Constraints

- Все строки интерфейса только через `t('ключ')` из `src/lib/i18n`; каждый раздел держит свои строки в `src/lib/i18n/uk/<раздел>.ts`.
- Любая нажимаемая область ≥ 48×48 px (класс `.tap` / CSS-переменная `--tap: 48px`).
- Цвета только через CSS-переменные из `src/styles/theme.css`; золото (`--gold`) — только успех.
- Изменения листа — только через `charStore.update(fn, {undo?: string})`; никакого прямого присваивания вне стора.
- Никаких сетевых запросов, кроме: загрузка модели Whisper (по явному действию) и Web Speech API (движок «Chrome»).
- `reference/` и `.superpowers/` не коммитятся (PDF и скриншоты — чужие материалы).
- `base: '/dnd-charsheet/'` в Vite (GitHub Pages).

## Review Focus

1. Старый/неполный документ персонажа из IndexedDB или импорта (нет новых полей) → `normalizeCharacter` заполняет значения по умолчанию, ничего не падает. Тест в Task 2.
2. Урон больше, чем временные + текущие хиты → текущие = 0, временные = 0, без отрицательных. Тест в Task 3.
3. Переброс 1 при преимуществе, когда выпали две единицы, и мин. 8 → каждая кость перебрасывается один раз, затем минимум. Тест в Task 4.
4. Формула урона с мусором (`1д6+МОД`, пробелы, кириллическая «д», пусто) → разбор терпим к «д»/пробелам, пустая формула = 0 без исключения. Тест в Task 4.
5. Импорт персонажа, чей id уже есть → создаётся копия с новыми id (лист, журнал, справочник, медиа), оригинал не тронут. Тест в Task 12.

---

### Task 1: Каркас проекта (контроллер)

**Files:** `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `src/main.ts`, `src/styles/theme.css`, `public/icons/*`.

- [ ] `npm install` указанных версий; `npm run dev` открывает пустую страницу на тёмном фоне.
- [ ] PWA: manifest (`name: "Таверна — аркуш персонажа"`, `display: standalone`, `orientation: any`, тёмный `theme_color: #17110e`), `globIgnores` для чанков transformers.
- [ ] Commit `chore: scaffold svelte pwa`.

### Task 2: Модель данных (контроллер)

**Files:** `src/lib/model/types.ts`, `src/lib/model/defaults.ts`, `src/lib/model/seed-frido.ts`, `src/lib/model/normalize.ts`, `src/lib/model/ids.ts`; test `src/lib/model/normalize.test.ts`.

**Produces:** типы `Character`, `Ability`, `SkillKey`, `SKILLS`, `Attack`, `Resource`, `Spell`, `Item`, `Feature`, `Deck`, `JournalEntry`, `TranscriptSegment`, `CodexEntry`, `MediaRecord`; `newCharacter(): Character`; `fridoSeed(): {character, codex}`; `normalizeCharacter(raw: unknown): Character`; `uid(): string`.

- [ ] Тест `normalize fills missing fields` (объект `{name:'X'}` → полный `Character`, `skills.deception.ability === 'cha'`); `keeps existing values`.
- [ ] Реализация; тесты зелёные; commit.

### Task 3: Правила (контроллер)

**Files:** `src/lib/rules/calc.ts`, `src/lib/rules/rest.ts`, `src/lib/rules/hp.ts`; tests рядом.

**Produces:** `abilityMod(score)`, `profBonusForLevel(level)`, `profBonus(c)`, `skillBonus(c,key)`, `saveBonus(c,ab)`, `initiative(c)`, `passivePerception(c)`, `attackBonus(c,atk)`, `resolveDamageFormula(c,atk): string`, `spellDC(c)`, `spellAttack(c)`, `applyDamage(hp,n)`, `applyHeal(hp,n)`, `shortRest(c): Character`, `longRest(c): Character`, `restPreview(c,kind): string[]`.

- [ ] Тесты по значениям Фридо: мод(8)=−1, мод(16)=+3; БМ(5)=3, БМ(1)=2, БМ(17)=6; Обман (экспертиза, Мдр) = +9; Переконливість (Хар, владение) = +4; переопределение навыка = ручное значение; доп. бонус +1 прибавляется; пассивная уважність = 16; Сковорідка = +6, формула `1d6+3`; урон 8 при temp 5, cur 35 → temp 0, cur 32; урон 100 → 0/0; лечение сверх максимума → max; короткий отдых восстанавливает «Кубики завзятості», длинный — хиты, кости хитов +⌊5/2⌋, слоты.
- [ ] Реализация; commit.

### Task 4: Движок кубиков (контроллер)

**Files:** `src/lib/dice/rng.ts`, `src/lib/dice/formula.ts`, `src/lib/dice/d20.ts`; tests рядом.

**Produces:** `type Rng = (sides:number)=>number`; `cryptoRng`; `parseFormula(s): {dice:{count,sides}[], flat:number}`; `rollFormula(s, {rng, crit?}): FormulaRoll`; `rollD20({bonus, mode, minD20, rerollOnes, rng}): D20Roll` с полями `dice: {face, rerolledFrom?, value, kept}[]`, `natural`, `total`, `crit`, `fumble`, `notes: string[]`; `addDie(roll, sides, rng)`.

- [ ] Тесты с детерминированным rng: переброс 1→5 затем мин 8 → 8; преимущество 1 и 1 с перебросом → обе перебрасываются; крит по грани 20; `1д6 + 3` = `1d6+3`; крит удваивает кости, не модификатор; пустая формула → total 0.
- [ ] Реализация; commit.

### Task 5: Хранилище и сторы (контроллер)

**Files:** `src/lib/db.ts`, `src/lib/stores/characters.svelte.ts`, `src/lib/stores/journal.svelte.ts`, `src/lib/stores/codex.svelte.ts`, `src/lib/stores/media.ts`, `src/lib/stores/ui.svelte.ts`, `src/lib/stores/dice.svelte.ts`; test `src/lib/db.test.ts`.

**Produces (используют все экраны):**
- `charStore`: `.list: CharacterSummary[]`, `.current: Character | null`, `.load()`, `.select(id)`, `.create()`, `.duplicate(id)`, `.remove(id)`, `.update(fn:(c:Character)=>void, opts?:{undo?:string})`.
- `ui`: `.mode: 'play'|'edit'`, `.tab: TabKey`, `.toast(msg, undo?: ()=>void)`, `.openSheet(component, props)`, `.closeSheet()`, `.switcherOpen`, `.quickNoteOpen`.
- `journal`: `.entries` (текущего персонажа, по убыванию), `.create(kind)`, `.update(id, patch)`, `.remove(id)`, `.currentSession(): JournalEntry` (последняя сессия или новая), `.appendSegment(entryId, seg)`, `.updateSegment(entryId, segId, patch)`.
- `codex`: `.items`, `.create(kind, name)`, `.update(id, patch)` (переименование правит `@[Старое]` → `@[Новое]` в журнале), `.remove(id)`, `.mentionsOf(id)`.
- `media`: `putMedia(characterId, blob): Promise<string>`, `getMediaUrl(id): Promise<string|null>`, `deleteMedia(id)`, `resizeImage(file, max=2048): Promise<Blob>`.
- `dice`: `.rollCheck({label, bonus, minD20?, kind:'skill'|'save'|'attack'|'init'|'death', attackId?})`, `.rollDamage({label, formula, crit})`, `.rollFree(spec)`, `.addResourceDie(resourceId)`, `.last`, `.history`, `.overlayOpen`, `.mode` (adv/dis/normal, сбрасывается после броска).

- [ ] Тест db на fake-indexeddb: сохранить/загрузить персонажа, записи журнала по персонажу, удаление каскадом.
- [ ] Реализация; commit.

### Task 6: Оболочка, тема, базовые компоненты (контроллер)

**Files:** `src/App.svelte`, `src/components/{NavRail,CharacterSwitcher,ModeToggle,Toast,SheetHost,Card,NumberField,TextField,TextArea,Stepper,Segmented,IconButton,Confirm,Icon}.svelte`, `src/lib/i18n/index.ts`, `src/lib/i18n/uk/common.ts`, заглушки `src/views/*/View.svelte`, `src/views/journal/SessionPanel.svelte` (заглушка), `src/views/dice/DiceOverlay.svelte` (заглушка), `src/views/dice/DiceTray.svelte` (заглушка).

- [ ] Ручная проверка в браузере 1280×800 и 800×1280: rail, переключение вкладок, режимы, панель персонажей, Фридо загружен при первом запуске.
- [ ] Commit.

### Task 7: Аркуш + Бій (субагент A)
Файлы: `src/views/sheet/*`, `src/views/combat/*` (кроме лотка), `src/lib/i18n/uk/sheet.ts`, `combat.ts`. Всё из перечня «Аркуш» и «Бій» спеки, включая карточки настроек по долгому тапу, numpad урона, отдых с подтверждением и undo.

### Task 8: Заклинання + Спорядження + Персонаж (субагент B)
Файлы: `src/views/spells/*`, `src/views/gear/*`, `src/views/profile/*`, `src/components/Gallery.svelte`, `src/components/ImagePicker.svelte`, i18n `spells.ts`, `gear.ts`, `profile.ts`. Включая колоды и галерею (портрет из галереи).

### Task 9: Журнал + справочник (субагент C)
Файлы: `src/views/journal/*` (кроме `SessionPanel.svelte`), `src/components/{MentionText,MentionEditor,Secret,QuickNote}.svelte`, `src/lib/mentions.ts` (+ тест), i18n `journal.ts`.

### Task 10: Режим сесії (субагент D)
Файлы: `src/views/journal/SessionPanel.svelte`, `src/lib/session/*` (`vad.ts` + тест, `capture.ts`, `wav.ts`, `engines/{webspeech,whisper,whisper.worker}.ts`, `claude.ts`), i18n `session.ts`.

### Task 11: Кубики UI (субагент E)
Файлы: `src/views/dice/*`, i18n `dice.ts`. Оверлей результата (анимация 0,6–0,8 с, вибрация, нат. 20 золото, нат. 1 красный, «+ кость ресурса», «кинути шкоду»), лоток (выбор костей, удержание = тряска), история.

### Task 12: Резервная копия (контроллер)
Файлы: `src/lib/backup.ts` (+ тест), кнопки в `CharacterSwitcher`. Экспорт ZIP, импорт ZIP/JSON как нового персонажа с перевыпуском id.

### Task 13: Сборка, деплой, инструкция (контроллер)
- [ ] `npm test`, `npm run build`, проверка `vite preview` в браузере.
- [ ] Репозиторий `dnd-charsheet` (публичный), GitHub Actions → Pages.
- [ ] `docs/КАК-УСТАНОВИТЬ.md`: открыть ссылку в Chrome, «Добавить на главный экран», микрофон, экспорт.
