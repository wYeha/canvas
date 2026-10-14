# Итерация 0.2: фронтенд-каркас

## Цель и контекст

Пункт 0.2 из `docs/PLAN.md`: «Vite + Vue 3 + TS (strict, `noUncheckedIndexedAccess`) + Pinia. Алиасы `@/` и `@shared`. Папки `views/`, `scripts/`, `styles/` по правилам».

Результат: workspace `frontend` собирается, проходит typecheck и поднимает dev-сервер; импорт из `@shared` (TS-исходники без сборки) работает и в Vite, и в vue-tsc; структура `frontend/src` соответствует `docs/rules/frontend.md`, раздел 2.

**Не делать (другие итерации):**
- ESLint, Prettier, Stylelint, Vitest, скрипт `check` — это 0.3;
- `_variables/_globals/_mixins.scss`, шрифты, темы, `data-theme`, `loadPaths` в Vite — это 0.4;
- фрагменты `CanvasHeader`/`CanvasViewport`/... и стили страницы — это 0.5;
- vue-router — это 10.5.

Перед началом прочитать: `CLAUDE.md`, `docs/rules/frontend.md` целиком (особенно разделы 2, 3, 5, 6, 7).

Текущее состояние: корневой `package.json` (workspaces: `["shared"]`, `"scripts": {}`), `shared/package.json` (`main`/`types` → `src/index.ts`), `shared/src/index.ts` содержит только `export {}`. Папки `frontend/` нет. `.gitignore` уже игнорирует `dist/`, `node_modules/`, `*.tsbuildinfo`.

---

## Архитектурные решения

1. **Типизация: три tsconfig без режима `--build`.**
   - `frontend/tsconfig.json` — solution-файл: `"files": []` + `references` на `./tsconfig.app.json` и `./tsconfig.node.json`. Нужен только IDE (Volar находит по нему, какой конфиг отвечает за `.vue`-файлы).
   - `frontend/tsconfig.app.json` — код приложения: `extends: "@vue/tsconfig/tsconfig.dom.json"`.
   - `frontend/tsconfig.node.json` — только `vite.config.ts`, без наследования (руками: `target`/`lib` `ES2023`, `module: ESNext`, `moduleResolution: Bundler`, `types: ["node"]`, `noEmit`, `skipLibCheck`, `isolatedModules`, `verbatimModuleSyntax`).
   - Скрипт typecheck: `vue-tsc --noEmit -p tsconfig.app.json && vue-tsc --noEmit -p tsconfig.node.json`.
   - *Почему не `vue-tsc --build`:* режим build требует tsbuildinfo-кэша и, в зависимости от версии TS, `composite` у вложенных проектов. Кэш может скрывать ошибки, а `composite` требует оговорок. Два прогона `-p` дают детерминированный результат без кэша.
   - В обоих конфигах **явно** указать `"strict": true` и `"noUncheckedIndexedAccess": true`, даже если base-конфиг их уже задаёт: требование видно прямо в файле.
   - `types` в обоих конфигах указывать явно (`["vite/client"]` в app, `["node"]` в node). В TS 6 значение `types` по умолчанию — `[]`, а `vite/client` даёт типы для `import.meta.env` и импортов `.scss`. Отдельный `env.d.ts` не нужен: vue-tsc понимает `.vue` без shim-файла.
   - **`baseUrl` не использовать** (в TS 6 он устарел). `paths` задаются относительно файла tsconfig.

2. **Алиасы.**
   - tsconfig.app.json, `compilerOptions.paths`:
     - `"@/*": ["./src/*"]`
     - `"@shared": ["../shared/src/index.ts"]`
     - `"@shared/*": ["../shared/src/*"]`
   - vite.config.ts, `resolve.alias` в виде **массива** (порядок важен, `@shared` идёт первым):
     - `{ find: /^@shared$/, replacement: <abs>/shared/src/index.ts }`
     - `{ find: /^@shared\//, replacement: <abs>/shared/src/ }`
     - `{ find: /^@\//, replacement: <abs>/frontend/src/ }`
   - Абсолютные пути строить через `fileURLToPath(new URL('../shared/src/index.ts', import.meta.url))` и т. п. (из `node:url`). Не склеивать строки руками: на Windows разделители получатся смешанными. Для префиксных замен (`/^@shared\//`, `/^@\//`) в конце replacement нужен `/`. После `fileURLToPath` путь будет с `\`, поэтому добавлять `'/'` к результату. Vite нормализует смешанный путь `E:\...\src/` + `foo.ts`, это проверяется сборкой (шаг 9).
   - `tsconfig.app.json.include`: `["src/**/*.ts", "src/**/*.vue", "../shared/src/**/*.ts"]`. Так shared проверяется со strict-настройками фронта, даже пока его никто не импортирует.
   - Пакет `@layout-canvas/shared` как зависимость фронта **не подключать**: правила требуют импорт через алиас `@shared`. Workspace-зависимость дала бы второй путь импорта.

3. **SCSS.** Ставим `sass` (dart-sass, modern API). В Vite 6+ modern compiler используется по умолчанию, поэтому `css.preprocessorOptions.scss.api` **не задавать**. `loadPaths` **не настраивать** в 0.2: в PLAN.md он явно отнесён к 0.4, а в пустом `main.scss` нечего подключать, так что проверить настройку было бы нечем. `styles/main.scss` в 0.2 — заглушка из одной строки-комментария: правило 4.1.2 требует, чтобы `main.ts` импортировал `main.scss`.

4. **Пустые папки держим через `.gitkeep`**, а не через файлы-заглушки.
   - *Почему:* заглушка `.ts`/`.vue` — это фиктивный код с фиктивными экспортами. Его пришлось бы комментировать, а потом удалять, и он нарушает «не забегать вперёд». `.gitkeep` — служебный файл git: его не видят Vite, TS и будущие линтеры. Правила «в views только .vue» и т. д. относятся к исходникам.
   - Правило для будущих итераций: `.gitkeep` удаляется, когда в папке появляется первый настоящий файл. Это указывается в заметке к 0.2 в PLAN.md.
   - `.gitkeep` нужен в: `views/components/`, `views/modals/`, `scripts/pages/canvas/`, `scripts/components/`, `scripts/modals/`. В `views/pages/canvas/` (там `CanvasPage.vue`), `scripts/globals/` (там `constants.ts`) и `styles/` (там `main.scss`) он не нужен.
   - Подпапки `styles/pages`, `styles/components`, `styles/modals`, `styles/fonts` **не создавать**: это каркас стилей 0.4.

5. **`'#app'` выносится в константу.** Правило 6.6 запрещает магические строки, поэтому создаётся `scripts/globals/constants.ts` с `APP_MOUNT_SELECTOR = '#app'`. Это настоящий файл, а не заглушка, и он заодно наполняет `scripts/globals/`.

6. **Скрипт `build` включает typecheck:** `"build": "npm run typecheck && vite build"`. Сломанные типы не попадут в сборку (это важно для деплоя на этапе 11). Отдельный `typecheck` остаётся для `check` в 0.3.

7. **Корневые скрипты-прокси:** `dev`, `build`, `preview`, `typecheck` → `npm run <x> -w frontend`. `check` **не добавлять** (это 0.3).

8. **Vue-файлы.**
   - `App.vue`: шапка-комментарий, `<template>` только с `<CanvasPage />`, `<script setup lang="ts">` только с импортом `CanvasPage` через `@/views/pages/canvas/CanvasPage.vue`. Импорт через алиас заодно постоянно проверяет `@/`. Имя `App` из одного слова — явное исключение из правил (раздел 2 называет его так). Для ESLint это решается в 0.3.
   - `CanvasPage.vue`: шапка-комментарий + `<template><div class="canvas-page"></div></template>`. Блок `<script setup lang="ts">` не добавлять: связывать нечего, фрагменты появятся в 0.5. Блока `<style>` нет (правило 4.1.2). Тег не самозакрывающийся, явный `</div>`.
   - `main.ts` импортирует App через `@/App.vue` (default-импорт SFC допустим), `createPinia`, `@/styles/main.scss` и `APP_MOUNT_SELECTOR`, затем `createApp(App).use(createPinia()).mount(APP_MOUNT_SELECTOR)`. Своих функций нет, поэтому JSDoc не нужен, только шапка файла.

9. **`index.html`** лежит в `frontend/` (корень Vite): `<!doctype html>` первой строкой, сразу за ним HTML-комментарий-шапка (комментарий *после* doctype, чтобы гарантированно не задеть режим рендеринга), `lang="ru"`, `meta charset`, `viewport`, `<title>Layout Canvas</title>`, `<div id="app"></div>`, `<script type="module" src="/src/main.ts"></script>`. Favicon и `data-theme` не добавлять (тема — это 0.4).

---

## Версии и установка

Ставить актуальные стабильные версии с совместимостью по peer-зависимостям. Перед установкой выполнить и посмотреть:

```
npm view vite version
npm view vue-tsc version
npm view vue-tsc peerDependencies
npm view @vitejs/plugin-vue peerDependencies
npm view typescript dist-tags
```

Правило выбора TypeScript: самая свежая стабильная **мажорная версия, которую поддерживает peer-диапазон vue-tsc**. Если `typescript@latest` — 7.x (нативный компилятор на Go), а vue-tsc его ещё не поддерживает, ставить `typescript@^6` (или ту мажорную версию, которую допускает peer vue-tsc). Vite 7+ требует Node `^20.19 || >=22.12`, Node 22.14 подходит.

Команды (из `E:\Pets\layout-canvas`, после шагов 1–2):

```
npm install -w frontend vue@latest pinia@latest
npm install -D -w frontend vite@latest @vitejs/plugin-vue@latest vue-tsc@latest @vue/tsconfig@latest typescript@<выбранная мажорная> @types/node@22 sass@latest
```

Диапазоны оставлять с `^` (по умолчанию в npm), точные версии фиксирует `package-lock.json`. Если npm выдаёт `ERESOLVE` или peer-warning между `vite` и `@vitejs/plugin-vue`, понизить `vite` до последней мажорной версии из peer-диапазона плагина. **Не использовать** `--force` и `--legacy-peer-deps`.

Поставленные версии записать в итоговом отчёте родителю (в PLAN.md не нужно, если обошлось без отклонений).

---

## Декомпозиция

- [x] **Шаг 1. Папка и `frontend/package.json`.** Поля: `name: "@layout-canvas/frontend"`, `version: "0.0.0"`, `private: true`, `description` (по-русски, например «Фронтенд Layout Canvas: Vue-приложение редактора раскладок.»), `type: "module"`, `scripts`:
  - `dev`: `vite`
  - `build`: `npm run typecheck && vite build`
  - `preview`: `vite preview`
  - `typecheck`: `vue-tsc --noEmit -p tsconfig.app.json && vue-tsc --noEmit -p tsconfig.node.json`
  
  Зависимости не вписывать руками.
  *Проверка:* файл валиден (`node -e "JSON.parse(require('fs').readFileSync('frontend/package.json','utf8'))"`).

- [x] **Шаг 2. Корневой `package.json`.** `workspaces: ["frontend", "shared"]`, `scripts`: `dev`, `build`, `preview`, `typecheck` в виде `npm run <x> -w frontend`. Остальные поля не трогать.
  *Проверка:* `npm query .workspace` (или `npm ls --workspaces --depth=0`) показывает оба workspace.

- [x] **Шаг 3. Установка зависимостей** по разделу «Версии и установка».
  *Проверка:* `npm ls -w frontend --depth=0` без `UNMET`/`invalid`; в `frontend/package.json` появились `dependencies` (vue, pinia) и `devDependencies` (остальные); `package-lock.json` обновлён. Внутри `frontend/` не должно появиться отдельного `package-lock.json`.

- [x] **Шаг 4. tsconfig-файлы** по решению 1 и 2: `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json`. Комментариев в JSON нет (правило 7.3).

- [x] **Шаг 5. `frontend/vite.config.ts`.** Шапка `/** ... */`, `import { fileURLToPath, URL } from 'node:url'`, `defineConfig` из `vite`, `vue` из `@vitejs/plugin-vue`, `plugins: [vue()]`, `resolve.alias` массивом по решению 2. `export default` здесь допустим (это конфиг). Внутри нет именованных функций; если worker выносит построение пути в хелпер, у хелпера нужен JSDoc.

- [x] **Шаг 6. `frontend/index.html`** по решению 9.

- [x] **Шаг 7. Исходники `frontend/src`:**
  - `src/main.ts`: шапка + решение 8;
  - `src/App.vue`: шапка `<!-- ... -->` + решение 8;
  - `src/views/pages/canvas/CanvasPage.vue`: шапка `<!-- Оркестратор страницы canvas: ... (фрагменты появятся в 0.5) -->` + решение 8;
  - `src/scripts/globals/constants.ts`: шапка `/** Глобальные константы приложения. */`, `export const APP_MOUNT_SELECTOR = '#app'` с JSDoc-строкой над константой;
  - `src/styles/main.scss`: одна строка `// Главная точка входа стилей: компилируется в итоговый CSS (каркас стилей появится в 0.4)`;
  - пустые `.gitkeep` по решению 4.
  
  *Проверка:* дерево `frontend/src` совпадает с решением 4. Во `views/` только `.vue`, в `scripts/` только `.ts`, в `styles/` только `.scss` (не считая `.gitkeep`).

- [x] **Шаг 8. Typecheck.** `npm run typecheck` из корня завершается с кодом 0.
  *Негативная проверка strict (временно, потом удалить):* создать `src/scripts/globals/strict-probe.ts` с `const list: number[] = []; export const FIRST: number = list[0]`. `npm run typecheck` должен упасть с ошибкой `Type 'number | undefined' is not assignable...`. Удалить файл, убедиться, что typecheck снова зелёный.

- [x] **Шаг 9. Проверка алиаса `@shared` (временная проба, потом удалить).**
  1. Создать `src/scripts/globals/shared-probe.ts`: `import * as sharedModule from '@shared'` и `export const SHARED_PROBE = sharedModule`; в `main.ts` временно добавить `import { SHARED_PROBE } from '@/scripts/globals/shared-probe'` и `console.info(SHARED_PROBE)`, чтобы импорт не выбросил tree-shaking.
  2. `npm run typecheck` и `npm run build` зелёные.
  3. Негатив: заменить `'@shared'` на `'@shared/missing'`. typecheck должен упасть с TS2307, `vite build` (запустить напрямую `npx -w frontend vite build`) — с ошибкой «failed to resolve import». Так видно, что алиас реально разрешается обоими инструментами и не игнорируется молча.
  4. Удалить пробу и временные строки из `main.ts`. typecheck и build снова зелёные.

- [x] **Шаг 10. Сборка.** `npm run build` из корня: код 0, есть `frontend/dist/index.html` и `frontend/dist/assets/*.js`. Папка `dist/` не попадает в `git status` (её игнорирует `.gitignore`).

- [x] **Шаг 11. Dev-сервер.** Запустить `npm run dev` в фоне (из корня). Дождаться строки `Local: http://localhost:5173/` и проверить:
  - `curl -s -o NUL -w "%{http_code}" http://localhost:5173/` → `200`, тело содержит `<div id="app">`;
  - `curl -s -w "%{http_code}" http://localhost:5173/src/main.ts` → `200` (трансформация TS и алиасов);
  - `curl ... /src/App.vue` → `200`;
  - `curl ... /src/styles/main.scss` → `200` (sass подключён).
  
  Остановить процесс (KillShell / `Stop-Process` по PID). Проверить `netstat -ano | findstr :5173`: порт свободен, зависших node-процессов нет. Если сервер сам занял 5174 из-за старого процесса, найти и убить старый процесс и повторить.
  Опционально: `npm run preview` и `curl http://localhost:4173/` → `200`, затем остановить.

- [x] **Шаг 12. Ревизия по правилам.** Пройтись по всем новым файлам:
  - у каждого `.ts`/`.vue`/`.scss`/`.html` есть шапка-комментарий на русском;
  - у каждой функции (если появились) есть JSDoc;
  - нет `any`, `export default` есть только в `vite.config.ts` (SFC — неявный);
  - нет `<style>` во `.vue`;
  - импорты только через `@/` и `@shared`, кроме относительных внутри одной папки;
  - временные пробы удалены (`Grep` по `probe` в `frontend/src` пусто).

- [x] **Шаг 13. `docs/PLAN.md`.** Отметить 0.2 `[x]` и добавить заметку под пунктом, например:
  `> Линтеров и `npm run check` ещё нет (0.3), поэтому готовность проверена через `npm run typecheck`, `npm run build` и запуск `npm run dev`. Пустые папки держатся через `.gitkeep`; его удаляют, когда в папке появляется первый файл. `loadPaths` для SCSS оставлен на 0.4.`
  Если были отклонения (другая мажорная версия TS, `composite`, `rootDir` и т. п.), дописать их туда же. `USER_GUIDE.md` не менять: пользовательских действий нет. **Коммит не делать**: его делает родитель.

---

## Риски и митигации

| Риск | Митигация |
|---|---|
| `typescript@latest` несовместим с vue-tsc (например, TS 7 на Go) | Выбирать мажорную версию TS по `npm view vue-tsc peerDependencies` (см. раздел «Версии») |
| TS 6: `baseUrl` устарел, `types` по умолчанию `[]` | `baseUrl` не используем, `types` указываем явно в обоих конфигах |
| TS6059 «File is not under rootDir» для `../shared/src` (в новых TS `rootDir` по умолчанию может быть папкой tsconfig) | Если ошибка появится, добавить в `tsconfig.app.json` `"rootDir": ".."` и записать это в заметку |
| IDE/TS ругается TS6306 «Referenced project must have composite» в `frontend/tsconfig.json` | На CLI не влияет (прогоны идут через `-p`). Если мешает IDE: добавить `"composite": true` + `"tsBuildInfoFile": "./node_modules/.tmp/<name>.tsbuildinfo"` в оба вложенных конфига, `noEmit` оставить |
| Алиас на папку вне `frontend/`: dev-сервер отказывается отдавать файлы shared (`server.fs.allow`) | Vite по умолчанию разрешает корень workspace (ищет `package.json` с `workspaces`, то есть `E:\Pets\layout-canvas`). Если в dev 403 на shared, добавить `server.fs.allow: [<abs repo root>]` |
| Строковый алиас `'@'` перехватывает `@shared` или scoped-пакеты (`@vue/...`) | Регулярки с якорями `^@\/` и `^@shared(\/|$)`, `@shared` первым в массиве |
| Пути Windows (`\` против `/`), смешанные разделители в alias replacement | Только `fileURLToPath(new URL(...))`, без ручной склейки; результат проверяется build и curl (шаги 9–11) |
| `&&` в npm-скриптах на Windows | npm запускает скрипты через `cmd.exe`, `&&` работает. Не использовать `;`, `rm`, `export VAR=` и другой POSIX-синтаксис |
| Зависший dev-сервер держит порт 5173 | Явная остановка + проверка `netstat` (шаг 11) |
| Пустой `main.scss` не попадает в сборку (нет CSS-ассета) | Это ожидаемо, ошибкой не считается |
| Проба с `@shared` случайно остаётся в коде | Шаг 9.4 и `Grep` в шаге 12 |
| `npm install -w frontend` до регистрации workspace даёт ошибку `No workspaces found` | Строгий порядок: шаги 1 → 2 → 3 |
| CRLF на Windows | Уже закрыто `.gitattributes`/`.editorconfig` из 0.1; новые файлы писать с LF |

---

## Критерии готовности

1. `npm run typecheck` из корня — код 0.
2. `npm run build` из корня — код 0, `frontend/dist/index.html` существует.
3. `npm run dev` поднимает сервер, `/`, `/src/main.ts`, `/src/App.vue` и `/src/styles/main.scss` отвечают 200; сервер остановлен.
4. Негативные проверки strict (`noUncheckedIndexedAccess`) и алиаса `@shared` проведены, пробы удалены.
5. Структура `frontend/src` соответствует решению 4; комментарии на месте; блоков `<style>` нет.
6. `docs/PLAN.md`: 0.2 отмечен `[x]`, заметка добавлена.

## Затронутые файлы

Изменяются:
- `E:\Pets\layout-canvas\package.json`
- `E:\Pets\layout-canvas\package-lock.json` (через npm)
- `E:\Pets\layout-canvas\docs\PLAN.md`

Создаются:
- `E:\Pets\layout-canvas\frontend\package.json`
- `E:\Pets\layout-canvas\frontend\index.html`
- `E:\Pets\layout-canvas\frontend\vite.config.ts`
- `E:\Pets\layout-canvas\frontend\tsconfig.json`
- `E:\Pets\layout-canvas\frontend\tsconfig.app.json`
- `E:\Pets\layout-canvas\frontend\tsconfig.node.json`
- `E:\Pets\layout-canvas\frontend\src\main.ts`
- `E:\Pets\layout-canvas\frontend\src\App.vue`
- `E:\Pets\layout-canvas\frontend\src\views\pages\canvas\CanvasPage.vue`
- `E:\Pets\layout-canvas\frontend\src\views\components\.gitkeep`
- `E:\Pets\layout-canvas\frontend\src\views\modals\.gitkeep`
- `E:\Pets\layout-canvas\frontend\src\scripts\globals\constants.ts`
- `E:\Pets\layout-canvas\frontend\src\scripts\pages\canvas\.gitkeep`
- `E:\Pets\layout-canvas\frontend\src\scripts\components\.gitkeep`
- `E:\Pets\layout-canvas\frontend\src\scripts\modals\.gitkeep`
- `E:\Pets\layout-canvas\frontend\src\styles\main.scss`

Не трогать: `shared/**`, `docs/USER_GUIDE.md`, `README.md`, `CLAUDE.md`, `docs/rules/**`.
