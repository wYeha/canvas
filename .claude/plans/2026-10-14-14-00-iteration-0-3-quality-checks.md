# Итерация 0.3: проверки качества

## Цель и контекст

Пункт 0.3 из `docs/PLAN.md`: «ESLint (vue + ts), Prettier, Stylelint (scss + `selector-class-pattern` под BEM), Vitest. Скрипт `npm run check` запускает всё сразу».

Результат: `npm run check` из корня последовательно запускает Prettier `--check`, Stylelint, vue-tsc, ESLint (type-aware) и Vitest и падает при любой ошибке. Линтеры автоматически ловят всё, что из `docs/rules/frontend.md` реально проверяется машиной. Остальное явно записано как «проверяется на ревью».

**Не делать (другие итерации):**
- `_variables/_globals/_mixins.scss`, `loadPaths`, темы: это 0.4. В Stylelint только **заготовить** overrides для `_globals.scss`/`_variables.scss`, сами файлы не создавать;
- фрагменты оболочки: это 0.5;
- свой tsconfig для `shared`: это 1.1 (см. заметку к 0.2);
- happy-dom/jsdom и тесты компонентов: не нужны, пока нет компонентной логики.

Перед началом прочитать `CLAUDE.md` и `docs/rules/frontend.md` целиком.

Текущее состояние: корневой `package.json` (workspaces `frontend`, `shared`; скрипты `dev/build/preview/typecheck` проксируют в frontend). `frontend/package.json`: Vite 8, vue-tsc 3, TypeScript ^6.0.3, sass, Vue 3.5, Pinia 4. Три tsconfig (`tsconfig.json` — solution, `tsconfig.app.json` включает `../shared/src/**/*.ts`, `tsconfig.node.json` — только `vite.config.ts`). Исходники: `main.ts`, `App.vue`, `views/pages/canvas/CanvasPage.vue` (без `<script>`), `scripts/globals/constants.ts` (`APP_MOUNT_SELECTOR = '#app'`), `styles/main.scss` (одна строка-комментарий), `shared/src/index.ts` (`export {}`). Линтеров нет.

---

## Архитектурные решения

### 1. Где живут инструменты

| Инструмент | Конфиг | Зависимости | Почему |
|---|---|---|---|
| ESLint | `E:\Pets\layout-canvas\eslint.config.js` (корень) | root `devDependencies` | Линтит и `frontend`, и `shared`, и корневые конфиги. В 10.1 тот же конфиг подхватит `backend`. Конфиг внутри `frontend/` не может линтить `../shared`: в ESLint 9 файлы вне base path игнорируются, в ESLint 10 конфиг ищется от папки файла, а у `shared/` своего конфига нет |
| Prettier | `prettier.config.js` + `.prettierignore` (корень) | root `devDependencies` | Prettier ищет конфиг вверх от файла, поэтому один корневой конфиг действует на весь репозиторий |
| Stylelint | `frontend/stylelint.config.js` | `frontend` | SCSS есть только во фронте |
| Vitest | секция `test` в `frontend/vite.config.ts` | `frontend` | Алиасы `@/` и `@shared` не нужно дублировать |

Все конфиги пишутся в `.js` (ESM, у пакетов `"type": "module"`), а не `.ts`: в Node 22.14 нет type stripping без флага, а `eslint.config.ts` потребовал бы `jiti`. Первой строкой каждого конфига идёт шапка `/** ... */`. `export default` в конфигах разрешён (см. решение 3.3).

### 2. Скрипты

**`frontend/package.json`** (проверки только в рамках workspace):
- `lint`: `eslint . --max-warnings 0`
- `lint:fix`: `eslint . --fix`
- `stylelint`: `stylelint \"src/**/*.scss\" --allow-empty-input --max-warnings 0` (кавычки экранированы двойные: npm на Windows запускает скрипты через `cmd.exe`, одинарные кавычки там не работают)
- `format`: `prettier --write . --ignore-path ../.gitignore --ignore-path ../.prettierignore`
- `format:check`: то же с `--check`
- `test`: `vitest run`
- `test:watch`: `vitest`
- `typecheck`: добавить третий прогон `vue-tsc --noEmit -p tsconfig.vitest.json` (решение 5)
- `check`: `npm run format:check && npm run stylelint && npm run typecheck && npm run lint && npm run test`

**Корневой `package.json`:**
- `format`: `prettier --write .`; `format:check`: `prettier --check .` (весь репозиторий, `.gitignore` и `.prettierignore` из корня Prettier 3 читает сам)
- `lint`: `eslint . --max-warnings 0`; `lint:fix`: `eslint . --fix` (весь репозиторий: frontend + shared + корневые конфиги)
- `stylelint`: `npm run stylelint -w frontend`
- `test`: `npm run test -w frontend`
- `typecheck`: уже есть
- `check`: `npm run format:check && npm run stylelint && npm run typecheck && npm run lint && npm run test`

*Почему корневой `check` не просто прокси в `frontend`:* корень покрывает больше (`shared`, корневые конфиги, `package.json`). Прокси пропустил бы эти файлы. Основная команда — `npm run check` из корня, она же указана в `CLAUDE.md`.

*Порядок «быстрые сначала»:* Prettier (около 1 с) → Stylelint (около 1 с) → vue-tsc → ESLint (type-aware, самый медленный из линтеров) → Vitest. Typecheck идёт раньше ESLint: при сломанных типах type-aware правила выдают шум.

### 3. ESLint

Стек: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-vue`, `vue-eslint-parser`, `@vue/eslint-config-typescript`, `eslint-plugin-jsdoc`, `eslint-config-prettier`.

**3.1. Путь A (основной): `@vue/eslint-config-typescript`.** Это официальная обёртка Vue, её использует create-vue с такой же раскладкой tsconfig (solution + app + node). Она уже решает две проблемы type-aware линтинга `.vue`: `projectService` + `extraFileExtensions` и `allowComponentTypeUnsafety` (по умолчанию `true`). Без неё `createApp(App)` в `main.ts` получил бы ложные `no-unsafe-argument`: обычный TS не знает тип импорта `.vue`.
- `configureVueProject({ scriptLangs: ['ts'], rootDir: import.meta.dirname })`
- `export default defineConfigWithVueTs(...)` со слоями в таком порядке:
  1. глобальные `ignores`: `**/dist/**`, `**/coverage/**` (`.gitignore` flat config не читает);
  2. `js.configs.recommended` (`@eslint/js`);
  3. `pluginVue.configs['flat/recommended']`;
  4. `vueTsConfigs.strictTypeChecked`;
  5. наши правила (3.2–3.6);
  6. исключения для конфигов (3.3) и `shared` (3.7);
  7. `eslint-config-prettier` (импорт `eslint-config-prettier/flat`) — **строго последним**: он выключает форматные правила, в том числе `vue/html-self-closing`, `vue/max-attributes-per-line` и т. п.

**Путь B (запасной), только если** `@vue/eslint-config-typescript` по peer не совместим с ESLint-мажором, общим для остальных пакетов, или падает на нашей раскладке: `tseslint.config`/`defineConfig` из `eslint/config` + `...tseslint.configs.strictTypeChecked` + `pluginVue.configs['flat/recommended']` + блок `files: ['**/*.vue']` с `languageOptions.parserOptions: { parser: tseslint.parser, projectService: true, tsconfigRootDir: import.meta.dirname, extraFileExtensions: ['.vue'] }`. Если на `.vue`-импортах в `.ts` полезут `no-unsafe-*`, отключить их точечно (только `no-unsafe-argument`/`no-unsafe-assignment`/`no-unsafe-call` для `frontend/src/main.ts`) и записать причину в заметку. Глобально не выключать.

**3.2. Правила для всех `**/*.{js,ts,vue}`:**
- `@typescript-eslint/no-explicit-any: 'error'` (есть в strict, задать явно для наглядности);
- `no-restricted-imports`: `patterns: [{ regex: '^\\.\\.(/|$)', message: 'Импорты через алиасы @/ и @shared; относительные пути только внутри одной папки (правило 6.3)' }]`. Если схема правила в установленной версии ESLint не знает `regex`, заменить на `group: ['..', '../*', '../**']`. Проба (шаг 11) обязательна в обоих вариантах. Правило ловит и `import type`, и `export * from '../…'`;
- `no-restricted-syntax`: `ExportDefaultDeclaration` и `ExportNamedDeclaration > ExportSpecifier[exported.name='default']` с сообщением «Только именованные экспорты (правило 6.2)». В `.vue` с `<script setup>` default-экспорта нет, поэтому правило безопасно и там. Default-**импорт** `.vue` (`import App from '@/App.vue'`) правило не затрагивает;
- `local/file-header` (решение 3.5);
- JSDoc (решение 3.4).

**3.3. Конфиги** (`files: ['**/*.config.{js,ts}']`, сюда попадают `eslint.config.js`, `prettier.config.js`, `frontend/stylelint.config.js`, `frontend/vite.config.ts`): `no-restricted-syntax: 'off'`. Для `**/*.js` дополнительно `tseslint.configs.disableTypeChecked`: `.js`-конфиги не входят ни в один tsconfig. Если `vueTsConfigs` и так не применяет typed-правила к `.js`, блок безвреден.

**3.4. JSDoc** (`eslint-plugin-jsdoc`, **без** пресета `recommended`: он требует `@param`/`@returns`, а правила просят «краткий JSDoc», типы и так даёт TS). `settings.jsdoc.mode: 'typescript'`. Правила:
- `jsdoc/require-jsdoc`: `['error', { publicOnly: false, enableFixer: false, require: { FunctionDeclaration: true, FunctionExpression: true, ArrowFunctionExpression: true, MethodDefinition: true, ClassDeclaration: true } }]`. `enableFixer: false` обязателен: иначе `lint:fix` вставит пустые `/** */`. `ArrowFunctionExpression`/`FunctionExpression` в этом правиле проверяются только при присваивании (переменная, свойство объекта, export), колбэки вида `.map(x => …)` и `it('…', () => …)` не затрагиваются. `<script setup>` без функций правило не трогает, `CanvasPage.vue` без `<script>` тоже: Program пустой, отчётов нет;
- `jsdoc/no-blank-blocks: 'error'`, `jsdoc/require-description: 'error'` (пустой или «только теги» JSDoc не проходит);
- `jsdoc/check-alignment: 'error'`.

**3.5. Шапка файла: проверяется автоматически, это дёшево.** Локальный плагин прямо в `eslint.config.js` (объект `{ rules: { 'file-header': … } }`, префикс `local`), примерно 20–25 строк, без зависимостей:
- `meta: { type: 'suggestion', schema: [], messages: { missing: 'Файл должен начинаться с комментария-шапки (правило 7.1)' } }`;
- `create(context)` → обработчик `Program`: берёт `context.sourceCode.text` (для `.vue` vue-eslint-parser отдаёт **весь** текст SFC, поэтому шапка `<!-- -->` видна) и `context.filename`. `.vue` → текст начинается с `<!--`; `.ts/.js` → текст начинается с `/**`. Иначе `report` на `{ line: 1, column: 0 }`;
- у `create` и у обработчика `Program` нужен JSDoc: наше же правило 3.4 действует и на конфиг.

Граница проверки: если файл начинается с JSDoc первой функции, а шапки нет, правило это пропустит. Осмысленность шапки остаётся на ревью. Для `.scss` то же делает локальный плагин Stylelint (решение 4). `index.html` не проверяется (ревью).

**3.6. Vue** (`files: ['**/*.vue']`):
- `vue/no-restricted-block: ['error', { element: 'style', message: 'Блок <style> запрещён: стили только в styles/ (правило 4.1.2)' }]`;
- `vue/block-order: ['error', { order: ['template', 'script'] }]`;
- `vue/block-lang: ['error', { script: { lang: 'ts' } }]`;
- `vue/component-api-style: ['error', ['script-setup']]`;
- `vue/define-props-declaration: ['error', 'type-based']`, `vue/define-emits-declaration: ['error', 'type-based']`;
- `vue/multi-word-component-names: ['error', { ignores: ['App'] }]` (исключение по разделу 2 правил);
- `vue/require-v-for-key` и `vue/valid-v-for` уже есть в `flat/recommended`, проверить, что включены как `error`;
- `vue/no-static-inline-styles: 'error'` (статичный `style="…"` запрещён: раскладка идёт только через `:style` из `nodeToStyle`, правило 4.4);
- `no-restricted-properties` с `object: 'document'` и свойствами `querySelector`, `querySelectorAll`, `getElementById`, `getElementsByClassName`, `getElementsByTagName`, сообщение «DOM только в scripts/ через template refs (правило 5.8)». Область — **все** `.vue` (во `views/` бывают только `.vue`, `App.vue` тоже компонент). Отдельное правило выбрано, чтобы не пересекаться с опциями `no-restricted-syntax`: в flat config опции одного правила из разных блоков не сливаются, а заменяются.

**Не тип файла для папки** (дёшево, без плагинов): блок `files: ['frontend/src/views/**/*.{ts,js}', 'frontend/src/scripts/**/*.vue']` с `no-restricted-syntax: ['error', { selector: 'Program', message: 'В views/ только .vue, в scripts/ только .ts (правило 2)' }]`. Здесь замена опций `no-restricted-syntax` допустима: файл неправилен целиком.

**3.7. `shared` и type-aware.** Файлы `shared/src/**` не лежат ни под одним tsconfig по цепочке папок (они входят только в `frontend/tsconfig.app.json`), поэтому `projectService` их не найдёт. Блок `files: ['shared/**/*.ts']`: `languageOptions.parserOptions: { projectService: false, project: ['./frontend/tsconfig.app.json'], tsconfigRootDir: import.meta.dirname }`. Если смешивать `projectService` и `project` в одном прогоне не получается (ошибка парсера), запасной вариант — `tseslint.configs.disableTypeChecked` для `shared/**`. Тогда в заметку PLAN.md записать: «в 1.1 вместе с tsconfig для shared включить type-aware линтинг shared».

**3.8. Сознательно оставлено на ревью** (машинная проверка слишком шумная или дорогая): длина функции около 40 строк (`max-lines-per-function` шумит на composable с вложенными функциями), магические числа и строки, `:key` по индексу, именование файлов и папок (kebab/Pascal), «чистая логика без vue/pinia» (пришлось бы сливать опции `no-restricted-imports` по папкам), `UPPER_SNAKE_CASE` констант, классы через computed, `Ui*` без хранилища, содержательность шапок, JSDoc у SCSS-миксинов, `@extend` между файлами, отсутствие CSS-вывода в `_variables`/`_mixins`. Этот список коротко попадает в `docs/rules/frontend.md` (шаг 13).

### 4. Stylelint (`frontend/stylelint.config.js`)

- `extends: ['stylelint-config-standard-scss']`;
- `plugins: [fileHeaderPlugin]`: локальный плагин в том же файле через `stylelint.createPlugin('local/file-header', ruleFn)`. `ruleFn` с `ruleName`, `messages` (`utils.ruleMessages`) и `meta`. Проверка: `root.first` существует, имеет `type === 'comment'` и `source.start.line === 1`. Для пустого файла это тоже ошибка. Если установленная версия Stylelint не принимает объект плагина в `plugins`, вынести плагин в файл `frontend/stylelint-file-header.js` (с шапкой) и подключить по пути. Если не работает и так, оставить шапку SCSS на ревью и записать в заметку;
- `selector-class-pattern`: `[/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z][a-z0-9]*(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$/, { resolveNestedSelectors: true, message: 'BEM: block, block__element, block--modifier, block__element--modifier; kebab-case, без элемента элемента (правило 4.3)' }]`. Шаблон допускает не больше одного `__` и одного `--`, поэтому `.a__b__c` и вложенный `&__a { &__b }` (после разрешения вложенности) падают. Селекторы с интерполяцией (`#{$b}__icon`) Stylelint пропускает как нестандартный синтаксис: так и задумано;
- `selector-max-id: 0`, `selector-max-type: 0`, `selector-max-attribute: 0`, `declaration-no-important: true`;
- `max-nesting-depth: 3`;
- `at-rule-disallowed-list: ['import']`;
- `scss/at-use-no-unnamespaced: true` (`@use … as *` запрещён, правило 4.1.6);
- `color-no-hex: true`, `color-named: 'never'` (правило 4.2: цвета только через `var(--color-…)`);
- `overrides`:
  - `files: ['**/_globals.scss']`: `selector-max-type: null`, `selector-max-attribute: null`;
  - `files: ['**/_variables.scss']`: `color-no-hex: null`, `color-named: null`.

  Файлов пока нет (0.4), overrides заготовлены заранее, чтобы 0.4 не правила линтер.
- `--allow-empty-input` в скрипте: на случай, если glob ничего не найдёт.

Конфликт с Prettier: в Stylelint 16+ нет стилистических правил, остаются только правила пустых строк. Если какое-то правило спорит с Prettier (после `format` Stylelint снова падает на том же месте), выключить именно его в конфиге с комментарием-причиной.

### 5. Vitest и типы тестов

- `frontend/vite.config.ts`: `defineConfig` импортировать из `vitest/config` вместо `vite`, добавить `test: { include: ['src/**/__tests__/**/*.test.ts'], environment: 'node' }`. Тесты запускаются **только** из `__tests__/` (правило 6.4). Тест вне `__tests__` не запустится, а Vitest упадёт с «No test files found», если тестов не останется вовсе. Шапку обновить: «Конфигурация Vite и Vitest: …». Алиасы работают в тестах автоматически.
- happy-dom/jsdom **не ставить**: тесты пока чистые функции (1.x). DOM-окружение появится вместе с первым тестом компонента.
- **`frontend/tsconfig.vitest.json`** (новый): `extends: "./tsconfig.app.json"`, `compilerOptions.types: ["node", "vite/client"]`, `include: ["src/**/__tests__/**/*.ts"]`, `exclude: []` (обязательно: иначе унаследуется исключение тестов). `tsconfig.app.json` получает `"exclude": ["src/**/__tests__/**"]`. В `tsconfig.json` добавляется reference на `./tsconfig.vitest.json`.
  *Почему:* импорт `vitest` в тесте тянет типы `vite` → `@types/node`. Без разделения `process`/`Buffer` стали бы видны коду приложения. create-vue делает так же.
- **Smoke-тест** `frontend/src/scripts/globals/__tests__/constants.test.ts`: проверяет, что `APP_MOUNT_SELECTOR` — id-селектор (`startsWith('#')`) и что `frontend/index.html` содержит элемент `id="<селектор без #>"`. HTML читается через `readFileSync(new URL('../../../../index.html', import.meta.url), 'utf8')` (`node:fs`). Это строка в `URL`, а не импорт, поэтому `no-restricted-imports` её не трогает. Константа импортируется через `@/scripts/globals/constants`, так что тест заодно проверяет алиас `@/` в Vitest.
  *Почему этот тест:* он ловит реальную поломку (переименовали контейнер в `index.html` или константу, и приложение молча не смонтировалось), а не проверяет сам себя. Импорты `describe/it/expect` из `vitest` явные, глобалы не включать. Шапка `/** Тесты глобальных констант: селектор монтирования совпадает с контейнером в index.html. */`.

### 6. Prettier

`prettier.config.js` (корень, с шапкой; JS выбран вместо JSON, чтобы прокомментировать выбор `printWidth`):
`semi: false`, `singleQuote: true`, `trailingComma: 'all'` (так уже написан код), `tabWidth: 2`, `useTabs: false`, `endOfLine: 'lf'` (совпадает с `.editorconfig`), **`printWidth: 120`**.
*Почему 120:* в `docs/rules/frontend.md` эталонные строки длиннее 100 символов: `const props = withDefaults(defineProps<UiButtonProps>(), { … })` (~108), сигнатура `moveNode(…)` (~105), строка `<button … @click=…>` в шаблоне. Код в `vite.config.ts` уже написан под ~110. При 80/100 Prettier ломал бы ровно те строки, которые правила показывают как образец. Экраны — от 1366px (раздел 10), 120 колонок помещаются.

`.prettierignore` (корень, с `#`-шапкой: это не JSON):
```
package-lock.json
*.md
.claude/
dist/
coverage/
```
*Почему без markdown:* документация пишется вручную. Prettier перевыровнял бы таблицы (`docs/rules/frontend.md`, `PLAN.md`) и списки, получился бы массовый дифф без пользы для кода. Пробелы и переводы строк в `.md` уже задаёт `.editorconfig`. `package.json` Prettier форматирует парсером `json-stringify` (как npm), поэтому «пинг-понга» с `npm install` не будет.

### 7. Версии

Перед установкой выполнить и посмотреть:
```
npm view eslint dist-tags
npm view @eslint/js dist-tags
npm view typescript-eslint peerDependencies
npm view eslint-plugin-vue peerDependencies
npm view vue-eslint-parser peerDependencies
npm view @vue/eslint-config-typescript peerDependencies
npm view eslint-plugin-jsdoc peerDependencies
npm view eslint-config-prettier peerDependencies
npm view prettier version
npm view stylelint dist-tags
npm view stylelint-config-standard-scss peerDependencies
npm view vitest version peerDependencies dependencies
```
Правила выбора:
- **ESLint:** самая свежая мажорная версия (10 или 9), которую допускают peer-диапазоны **всех** пакетов из списка. `@eslint/js` той же мажорной версии, что `eslint`. Совместимость важнее свежести.
- **TypeScript не трогать** (6.x закреплён из-за vue-tsc). Peer `typescript` у `typescript-eslint` и `@vue/eslint-config-typescript` обязан включать установленный 6.x. Если не включает, **остановиться и спросить пользователя**: не понижать и не повышать TS.
- **Vitest:** версия, у которой `vite` (dependency/peer) допускает Vite 8. Если такой нет, остановиться и спросить: Vite не понижать молча.
- **Stylelint:** мажорная версия из peer `stylelint-config-standard-scss@latest`.

Команды (из `E:\Pets\layout-canvas`):
```
npm install -D eslint@<мажор> @eslint/js@<мажор> typescript-eslint@latest eslint-plugin-vue@latest vue-eslint-parser@latest @vue/eslint-config-typescript@latest eslint-plugin-jsdoc@latest eslint-config-prettier@latest prettier@latest
npm install -D -w frontend stylelint@<мажор> stylelint-config-standard-scss@latest vitest@<версия>
```
Первая команда без `-w` попадает в `devDependencies` корня, так и задумано. `--force`/`--legacy-peer-deps` **не использовать**. При `ERESOLVE` разобрать конфликт и выбрать совместимые версии по правилам выше. Поставленные версии записать в отчёте родителю.

---

## Декомпозиция

- [x] **Шаг 1. Версии и установка** по разделу 7.
  *Проверка:* `npm ls --depth=0` и `npm ls -w frontend --depth=0` без `UNMET`/`invalid`/`ERESOLVE`. `npm ls typescript` — одна версия 6.x (везде `deduped`). `npm ls vite` — одна версия 8.x (vitest не притащил свою). Отдельного `package-lock.json` в `frontend/` нет. Корневые линт-пакеты лежат в `devDependencies` корня, а не frontend.

- [x] **Шаг 2. Prettier.** Создать `E:\Pets\layout-canvas\prettier.config.js` и `E:\Pets\layout-canvas\.prettierignore` по решению 6. Добавить корневые скрипты `format`, `format:check`.
  *Проверка:* `npx prettier --check .` из корня. Если есть расхождения, запустить `npm run format` и просмотреть дифф (`git diff`): менять разрешено только форматирование, без изменения смысла. `.md`, `package-lock.json`, `dist/` в выводе не фигурируют.

- [x] **Шаг 3. Stylelint.** Создать `frontend/stylelint.config.js` по решению 4 (шапка, JSDoc у функций плагина). Добавить скрипт `stylelint` во frontend и прокси в корень.
  *Проверка:* `npm run stylelint` зелёный на текущем `main.scss` (там только комментарий-шапка).

- [x] **Шаг 4. Vitest и tsconfig тестов.** По решению 5: правка `vite.config.ts`, новый `tsconfig.vitest.json`, `exclude` в `tsconfig.app.json`, reference в `tsconfig.json`, третий прогон в `typecheck`. Тест `src/scripts/globals/__tests__/constants.test.ts`. Скрипты `test`, `test:watch` во frontend, прокси `test` в корень.
  *Проверка:* `npm run test` — 1 файл, тесты зелёные. `npm run typecheck` — три прогона, код 0. Временно вставить `process.cwd()` в `constants.ts` → `typecheck` должен упасть (в app-коде нет node-типов). Вернуть. Временно поменять ожидаемый id в тесте → `npm run test` падает. Вернуть.

- [x] **Шаг 5. ESLint: база.** Создать `E:\Pets\layout-canvas\eslint.config.js` (слои 1–4 и 7 из решения 3.1, исключения 3.3 и 3.7). Скрипты `lint`, `lint:fix` в корень и во frontend.
  *Проверка:* `npm run lint` из корня проходит или выдаёт только содержательные ошибки, без «parserOptions.project / not found by the project service». `npx eslint --debug frontend/src/App.vue` (или `--print-config`) показывает, что `.vue` разбирается `vue-eslint-parser` с TS-парсером. Если `.vue` или `vite.config.ts` не находятся project service, перейти на путь B (решение 3.1).

- [x] **Шаг 6. ESLint: наши правила** 3.2, 3.4, 3.5, 3.6 (включая локальный плагин `local/file-header` и блок «не тот тип файла в папке»).
  *Проверка:* `npm run lint` из корня зелёный на существующем коде. `npx eslint --print-config frontend/src/App.vue` содержит `vue/no-restricted-block`, `vue/block-order`, `jsdoc/require-jsdoc` и `local/file-header`, причём `eslint-config-prettier` их не выключил.

- [x] **Шаг 7. Скрипты `check`.** Во frontend и в корне по решению 2. Добавить `format`/`format:check` во frontend (с `--ignore-path`).
  *Проверка:* `npm run check` из корня — код 0. `npm run check -w frontend` — код 0. В выводе `npm run format:check -w frontend` нет `dist/`.

- [x] **Шаг 8. Существующий код проходит.** Если что-то из `main.ts`, `App.vue`, `CanvasPage.vue`, `constants.ts`, `vite.config.ts`, `shared/src/index.ts`, `index.html`, tsconfig/package.json падает, исправлять **без изменения смысла** (форматирование, недостающая шапка). Отключать правила ради существующего кода нельзя: если правило конфликтует с правилами проекта, остановиться и спросить.
  *Проверка:* `npm run check` зелёный, `npm run build` зелёный (vite.config.ts изменён).

- [x] **Шаг 9. Негативная проба: `any`.** `frontend/src/scripts/globals/any-probe.ts` (с шапкой, отформатирован Prettier): `export const ANY_PROBE: any = 1`.
  *Проверка:* `npm run check` из корня падает (ненулевой `$LASTEXITCODE`) на `@typescript-eslint/no-explicit-any`. Удалить файл.

- [x] **Шаг 10. Негативная проба: `<style>` в `.vue`.** `frontend/src/views/pages/canvas/CanvasProbe.vue`: шапка, `<template><div class="canvas-probe"></div></template>`, `<style>.canvas-probe { display: block; }</style>`.
  *Проверка:* `npm run check` падает на `vue/no-restricted-block`. Дополнительно (запускать `npm run lint`): переставить `<script setup lang="ts">` перед `<template>` → `vue/block-order`; добавить в script `document.querySelector('.x')` → `no-restricted-properties`; добавить `function probe() {}` без JSDoc → `jsdoc/require-jsdoc`; убрать шапку → `local/file-header`. Удалить файл.

- [x] **Шаг 11. Негативная проба: относительный импорт.** `frontend/src/scripts/globals/relative-probe.ts` (шапка): `import { APP_MOUNT_SELECTOR } from '../globals/constants'` + `export const RELATIVE_PROBE = APP_MOUNT_SELECTOR`. Typecheck при этом зелёный, так что падение даёт именно ESLint.
  *Проверка:* `npm run check` падает на `no-restricted-imports`. Дополнительно (через `npm run lint`): путь `'../../scripts/globals/constants'` → тоже падает; `export default RELATIVE_PROBE` → `no-restricted-syntax`; файл без шапки → `local/file-header`. Удалить файл.

- [x] **Шаг 12. Негативная проба: BEM.** `frontend/src/styles/_probe.scss` (с шапкой `// …`): `.probe__a__b { display: block; }`.
  *Проверка:* `npm run check` падает на `selector-class-pattern`. Дополнительно (через `npm run stylelint`) по очереди: вложенный `.probe { &__a { &__b { display: block; } } }` → `selector-class-pattern` (работает `resolveNestedSelectors`); `#probe {}` → `selector-max-id`; `display: block !important` → `declaration-no-important`; `@import 'x';` → `at-rule-disallowed-list`; `div {}` → `selector-max-type`; `color: #fff` → `color-no-hex`; файл без шапки → `local/file-header`; корректный `.probe { &__a { display: block; } &--b { display: block; } }` → зелёный. Удалить файл.
  Дополнительно для Prettier: в любом `.ts` временно заменить `'` на `"` → `npm run check` падает на `format:check`. Вернуть.
  > Выполнено с отклонением: проба вложенного `.probe { &__a { &__b {} } }` НЕ падает. В Stylelint 17 у `selector-class-pattern` удалена опция `resolveNestedSelectors` (в 16.x была), опция молча игнорируется. Остальные пробы шага дают ожидаемые правила. Нужно решение planner.
  > Доработка: добавлено локальное правило `local/bem-nesting` в `frontend/stylelint.config.js` (разворачивает `&` и `#{$b}`, проверяет классы тем же BEM-паттерном, запрещает элемент элемента и элемент от модификатора через `&__`); мёртвая опция `resolveNestedSelectors` убрана. Пробы `&__a { &__b }`, `&__Bad`, `&--a { &__b }` валят `npm run check`, корректные вложенные селекторы проходят.

- [x] **Шаг 13. `docs/rules/frontend.md`.** Только раздел 11 «Готовность итерации»: поправить первую строку списка на «`npm run check` из корня: Prettier `--check`, Stylelint, `vue-tsc`, ESLint и Vitest» и добавить короткий абзац:
  - **автоматически** проверяются: `any`, default-экспорты, `../`-импорты, `<style>` и порядок блоков в `.vue`, `<script setup lang="ts">`, многословные имена, `v-for` с `:key`, `document.querySelector` и др. в `.vue`, статичный `style=""`, JSDoc у функций, наличие шапки (`.ts/.js/.vue/.scss`), тип файла по папке `views/`/`scripts/`, BEM-паттерн, id-, тег- и атрибут-селекторы, `!important`, вложенность больше 3, `@import`, `@use … as *`, hex и именованные цвета вне `_variables.scss`, форматирование (Prettier, `npm run format`), тесты только в `__tests__/`;
  - **только на ревью**: список из решения 3.8.

  Остальные разделы не трогать.

- [x] **Шаг 14. Финальная ревизия.**
  - `Grep` по `probe` в `frontend/src` и `shared` пуст, временных правок нет;
  - у каждого нового `.js/.ts` есть шапка, у функций в конфигах есть JSDoc, в JSON нет комментариев;
  - `npm run check` из корня — код 0, `npm run build` — код 0;
  - `git status`: изменились только файлы из списка ниже, `.gitkeep` не тронуты.

- [x] **Шаг 15. `docs/PLAN.md`.** Отметить 0.3 `[x]` и добавить заметку `> ...`: ESLint и Prettier — в корне репозитория (линтят frontend, shared и конфиги), Stylelint и Vitest — во frontend; `npm run check` из корня — главный; тесты типизируются отдельным `tsconfig.vitest.json` (node-типы не видны приложению); markdown Prettier не форматирует; шапки файлов проверяют локальные правила ESLint/Stylelint, остальное на ревью (см. правила, раздел 11); как type-aware линтится shared (через `project` frontend или выключено до 1.1); ESLint-мажор, если он не последний, и почему. `USER_GUIDE.md` не трогать: пользовательских действий нет. **Коммит не делать.**

---

## Риски и митигации

| Риск | Митигация |
|---|---|
| Плагины ещё не поддерживают ESLint 10 по peer | Брать максимальный мажор, общий для всех peer (раздел 7). ESLint 9 допустим |
| `typescript-eslint` не поддерживает TS 6.x по peer | Стоп и вопрос пользователю. TS не менять, `--legacy-peer-deps` не использовать |
| В дереве две копии TypeScript или Vite (peer auto-install, vitest со своим vite) → странные ошибки типов в `vite.config.ts` | `npm ls typescript` / `npm ls vite` в шаге 1, должна быть одна копия |
| `.vue` или `vite.config.ts` «not found by the project service» (solution-tsconfig, extraFileExtensions) | Путь A решает это из коробки (раскладка как у create-vue). Иначе путь B. В крайнем случае `project: ['./frontend/tsconfig.app.json', './frontend/tsconfig.node.json', './frontend/tsconfig.vitest.json']` |
| `shared/**` вне цепочки tsconfig | Блок с `project` (3.7), запасной вариант — `disableTypeChecked` + заметка на 1.1 |
| Ложные `no-unsafe-*` на импортах `.vue` | `allowComponentTypeUnsafety` (путь A) или точечное отключение для `main.ts` (путь B) |
| `eslint-config-prettier` выключает нужное правило или стоит не последним | Ставить последним. Наши правила (block-order, no-restricted-block, jsdoc) не форматные, проверить через `--print-config` (шаг 6) |
| `jsdoc/require-jsdoc --fix` вставляет пустые `/** */` | `enableFixer: false` + `jsdoc/no-blank-blocks` |
| `regex` в `no-restricted-imports` не поддерживается версией ESLint | `group: ['..', '../*', '../**']`, проба в шаге 11 на двух глубинах |
| Опции `no-restricted-syntax` из разных блоков заменяют друг друга | querySelector — через `no-restricted-properties`. Program-блок «не тот тип файла» заменяет опции осознанно |
| Одинарные кавычки и POSIX-синтаксис в npm-скриптах на Windows (`cmd.exe`) | Только `\"…\"` в JSON, `&&` для цепочек |
| Prettier из `frontend/` не видит корневые ignore-файлы и проверяет `dist/` | `--ignore-path ../.gitignore --ignore-path ../.prettierignore`, проверка в шаге 7 |
| Prettier массово переформатирует docs | `*.md` в `.prettierignore` |
| Inline-плагин Stylelint не принимается | Плагин в отдельный файл, иначе ревью + заметка (решение 4) |
| Правила пустых строк Stylelint спорят с Prettier | Выключить конкретное правило с комментарием-причиной |
| Node-типы протекают в код приложения через `vitest` | `tsconfig.vitest.json` + `exclude` тестов в app-конфиге, негативная проверка `process.cwd()` в шаге 4 |
| `import.meta.url` в тесте указывает не туда | Если тест не находит `index.html`, вывести путь в сообщении ошибки и поправить число `../`. Путь абсолютный, от `cwd` не зависит |
| Пробы остаются в коде | Удаление в каждом шаге + `Grep probe` в шаге 14 |
| Правило проекта мешает существующему коду или правило линтера противоречит правилам проекта | Не обходить: остановиться и спросить (CLAUDE.md) |

---

## Критерии готовности

1. `npm run check` из корня — код 0. Последовательность: format:check → stylelint → typecheck (3 прогона) → lint → test.
2. `npm run check -w frontend` и `npm run build` — код 0.
3. Каждая из четырёх обязательных проб (`any`, `<style>`, `.a__b__c`, `../`) валит `npm run check` с ожидаемым правилом. Дополнительные пробы шагов 10–12 дают ожидаемые правила. Все пробы удалены.
4. В дереве одна копия TypeScript 6.x и одна Vite 8.x, peer-конфликтов нет, `--force`/`--legacy-peer-deps` не использовались.
5. Новые `.js/.ts` с шапкой, функции в конфигах с JSDoc, JSON без комментариев.
6. `docs/rules/frontend.md` (раздел 11) и `docs/PLAN.md` (0.3 `[x]` + заметка) обновлены. `USER_GUIDE.md` не тронут.

## Затронутые файлы

Создаются:
- `E:\Pets\layout-canvas\eslint.config.js`
- `E:\Pets\layout-canvas\prettier.config.js`
- `E:\Pets\layout-canvas\.prettierignore`
- `E:\Pets\layout-canvas\frontend\stylelint.config.js` (+ `frontend\stylelint-file-header.js` только по запасному варианту решения 4)
- `E:\Pets\layout-canvas\frontend\tsconfig.vitest.json`
- `E:\Pets\layout-canvas\frontend\src\scripts\globals\__tests__\constants.test.ts`

Изменяются:
- `E:\Pets\layout-canvas\package.json` (scripts, devDependencies)
- `E:\Pets\layout-canvas\package-lock.json` (через npm)
- `E:\Pets\layout-canvas\frontend\package.json` (scripts, devDependencies)
- `E:\Pets\layout-canvas\frontend\vite.config.ts` (`vitest/config`, секция `test`, шапка)
- `E:\Pets\layout-canvas\frontend\tsconfig.json` (reference на vitest)
- `E:\Pets\layout-canvas\frontend\tsconfig.app.json` (`exclude` тестов)
- `E:\Pets\layout-canvas\docs\rules\frontend.md` (только раздел 11)
- `E:\Pets\layout-canvas\docs\PLAN.md` (0.3 `[x]` + заметка)
- возможно, только форматирование: `frontend\src\**`, `shared\src\index.ts`, `frontend\index.html`, `frontend\tsconfig*.json`

Не трогать: `docs/USER_GUIDE.md`, `README.md`, `CLAUDE.md`, `docs/DESIGN.md`, `docs/TOKENS.md`, `.editorconfig`, `.gitignore`, `.gitkeep`-файлы.
