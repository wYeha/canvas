# Правила фронтенда

Обязательны для всех, кто пишет код в `frontend/`: и для людей, и для ИИ-агентов. Перед любой правкой прочитайте этот файл целиком. Если правило мешает задаче, не обходите его молча: остановитесь и спросите пользователя.

---

## 1. Общие принципы

1. **Правило шаблонов.** Любой повторяющийся элемент интерфейса (используется 2+ раза или очевидно будет переиспользоваться: кнопка, поле, селект, секция панели, модалка) выносится в **общий компонент** с типизированным списком пропсов. Копировать разметку между файлами запрещено.
2. **Оркестраторы.**
   - `App.vue` — главный оркестратор приложения. Он только подключает страницы (позже `<router-view>`) и глобальные обёртки. Своей разметки и логики в нём нет.
   - Страница (`CanvasPage.vue`) — оркестратор страницы. Она только собирает фрагменты. **Каждый фрагмент страницы лежит в отдельном файле.**
3. **Одна сущность — одно имя в трёх местах.** Разметка, скрипты и стили сущности лежат в папках с **одинаковым** именем (см. раздел 2).
4. **Всё по полочкам.** Новый файл кладётся строго в папку своего типа по таблице ниже. Если подходящей папки нет, спросите, а не создавайте «misc» или «utils2».

---

## 2. Структура `frontend/src`

```
src/
  App.vue                         — главный оркестратор
  main.ts                         — точка входа: createApp, Pinia, подключение main.scss
  views/                          — ТОЛЬКО .vue-файлы
    pages/
      canvas/
        CanvasPage.vue            — оркестратор страницы
        CanvasToolbar.vue         — фрагмент
        CanvasLayers.vue          — фрагмент
        CanvasPreview.vue         — фрагмент
        CanvasProps.vue           — фрагмент
        ...
    components/
      ui-button/UiButton.vue
      ui-select/UiSelect.vue
      ...
    modals/
      export-modal/ExportModal.vue
  scripts/                        — ТОЛЬКО .ts-файлы
    globals/                      — общее для всего приложения
      constants.ts
      storage.ts                  — обёртка над localStorage
      id.ts                       — генерация id
      ...
    pages/
      canvas/                     — логика страницы canvas
        layout-store.ts           — Pinia-хранилище
        tree.ts                   — чистые операции над деревом
        node-style.ts             — узел → объект CSS-стилей
        export-html.ts            — генератор HTML
        dnd/                      — перетаскивание
        use-canvas-hotkeys.ts     — composable
        types.ts
        __tests__/                — тесты Vitest
    components/
      ui-button/
        ui-button.types.ts        — Props/Emits компонента
        use-ui-button.ts          — логика (только если она есть)
    modals/
      export-modal/
        export-modal.types.ts
        use-export-modal.ts
  styles/                         — ТОЛЬКО .scss и шрифты
    main.scss                     — единственная точка входа стилей
    _variables.scss               — глобальные переменные
    _globals.scss                 — нормализация, базовые стили, :root, @font-face
    _mixins.scss                  — миксины и функции
    fonts/                        — файлы шрифтов (.woff2)
    components/
      _ui-button.scss
      _ui-select.scss
    pages/
      canvas/
        _index.scss               — точка входа стилей страницы
        _canvas-page.scss
        _canvas-toolbar.scss
        ...
    modals/
      _export-modal.scss
```

Общие для фронта и бэка типы дерева и zod-схемы лежат в корневом `shared/` и импортируются через алиас `@shared`.

### Таблица соответствия

| Сущность | Разметка | Скрипты | Стили | BEM-блок |
|---|---|---|---|---|
| Общий компонент | `views/components/ui-button/UiButton.vue` | `scripts/components/ui-button/` | `styles/components/_ui-button.scss` | `.ui-button` |
| Страница | `views/pages/canvas/CanvasPage.vue` | `scripts/pages/canvas/` | `styles/pages/canvas/_canvas-page.scss` | `.canvas-page` |
| Фрагмент страницы | `views/pages/canvas/CanvasToolbar.vue` | `scripts/pages/canvas/` | `styles/pages/canvas/_canvas-toolbar.scss` | `.canvas-toolbar` |
| Модалка | `views/modals/export-modal/ExportModal.vue` | `scripts/modals/export-modal/` | `styles/modals/_export-modal.scss` | `.export-modal` |

---

## 3. Именование

| Что | Формат | Пример |
|---|---|---|
| Папки, `.ts`- и `.scss`-файлы | kebab-case | `layout-store.ts`, `_ui-button.scss` |
| Vue-компоненты | PascalCase, минимум два слова | `UiButton.vue`, `CanvasToolbar.vue` |
| Общие компоненты | префикс `Ui` | `UiSelect` → `.ui-select` |
| Фрагменты страницы | префикс страницы | `CanvasLayers` → `.canvas-layers` |
| Модалки | суффикс `Modal` | `ExportModal` → `.export-modal` |
| Composables | `useXxx` в файле `use-xxx.ts` | `useCanvasHotkeys` |
| Типы пропсов | `<имя>.types.ts`, интерфейсы `XxxProps`, `XxxEmits` | `UiButtonProps` |
| Константы | `UPPER_SNAKE_CASE` | `MAX_HISTORY_SIZE` |
| BEM-блок | имя компонента в kebab-case | `UiButton` → `ui-button` |

---

## 4. SCSS

### 4.1. Подключение (`@use`)

1. `@import` **запрещён**. Используется только `@use` (и `@forward`, если нужно).
2. `main.ts` импортирует **только** `styles/main.scss`. В `.vue`-файлах блоков `<style>` нет: ни scoped, ни обычных.
3. `main.scss` подключает только верхний уровень:
   ```scss
   // Главная точка входа стилей: компилируется в итоговый CSS
   @use 'globals';
   @use 'pages/canvas';
   @use 'modals/export-modal';
   ```
4. **Страница подключает в начале своего `_index.scss` всё, что ей нужно**: стили используемых общих компонентов, затем свои фрагменты.
   ```scss
   // Точка входа стилей страницы canvas: компоненты, затем фрагменты
   @use 'components/ui-button';
   @use 'components/ui-select';

   @use 'canvas-page';
   @use 'canvas-toolbar';
   @use 'canvas-layers';
   ```
   Модалка точно так же подключает компоненты, которые использует. `@use` загружает модуль один раз, поэтому если компонент подключён в нескольких местах, CSS всё равно не дублируется. Подключайте стиль компонента в каждой странице или модалке, которая его использует, даже если «он уже где-то подключён».
5. В Vite настроен `loadPaths: ['src/styles']`, поэтому пути пишутся от корня `styles` (`@use 'variables' as v;`), без `../../`.
6. Переменные и миксины подключаются **с пространством имён**:
   ```scss
   @use 'variables' as v;
   @use 'mixins' as mx;

   .ui-button {
     padding: v.$space-2 v.$space-3;
     @include mx.focus-ring;
   }
   ```
   `as *` не используем.
7. `_variables.scss` и `_mixins.scss` **не выводят CSS**: в них только переменные, карты, миксины и функции. Весь глобальный CSS (нормализация, `:root`, `@font-face`, `body`) лежит в `_globals.scss`.
8. `@extend` между файлами запрещён. Для общего кода используйте миксины.
9. **Исключение: dev-only страницы** (витрина `ui-kit`) не подключаются в `main.scss`: свою точку входа стилей они импортируют из модуля своего динамического чанка (`scripts/pages/ui-kit/ui-kit-page-loader.ts`), который грузится только под `import.meta.env.DEV`. Так их CSS не попадает в production. Переменные таких страниц лежат рядом со стилями страницы, а не в `_variables.scss`.

### 4.2. Значения

- Цвета, отступы, радиусы, размеры шрифтов, z-index и длительности анимаций берутся **только из `_variables.scss`**, а значения в нём — из [docs/TOKENS.md](../TOKENS.md). Магические числа запрещены, исключения: `0`, `1px` для обводок, `100%`.
- Цвета в стилях компонентов задаются **только** через CSS-переменные темы (`var(--color-…)`). Сырые hex и Sass-переменные цветов в компонентах запрещены (подробнее в разделе 10).

### 4.3. BEM

1. Класс бывает только одного из видов: `block`, `block__element`, `block--modifier`, `block__element--modifier`. Только латиница, kebab-case.
2. **Элемент элемента запрещён.** Вложенность в разметке не повторяется в имени класса:
   ```scss
   .canvas-toolbar__group__button {}  // ❌
   .canvas-toolbar__button {}         // ✅
   ```
3. В SCSS элементы пишутся только через `&__`, модификаторы только через `&--`. Внутри `&__element` нельзя писать ещё один `&__`: это даст элемент элемента.
4. Если модификатор блока влияет на элемент, используйте переменную `$b`:
   ```scss
   // Стили общего компонента кнопки
   .ui-button {
     $b: &;

     display: inline-flex;

     &__icon {
       width: v.$icon-size;
     }

     &--primary {
       background: var(--color-accent);

       #{$b}__icon {
         color: var(--color-on-accent);
       }
     }

     &:hover {
       opacity: 0.9;
     }
   }
   ```
5. Модификатор всегда ставится **вместе** с базовым классом: `class="ui-button ui-button--primary"`. Модификаторы бывают булевы (`--active`) или «ключ-значение» (`--size-s`). Состояния выражаются тоже модификаторами (`--selected`, `--dragging`), а не классами `.is-*`.
6. Селекторы по тегам, id, атрибутам и `!important` запрещены. Исключение: `_globals.scss`, где нормализация работает по тегам. Псевдоклассы и псевдоэлементы (`&:hover`, `&::before`) разрешены.
7. Вложенность в SCSS не глубже 3 уровней.
8. **Миксы.** Внешнюю геометрию компонента (margin, позицию в grid или flex родителя) задаёт **родитель** через свой элемент:
   ```vue
   <UiButton class="canvas-toolbar__button" />
   ```
   Сам компонент внешних отступов себе не ставит.

### 4.4. Исключения: блоки превью, камера канваса и всплывающие списки

Раскладочные стили блоков в превью (`display`, `flex-*`, `grid-*`, `gap`, `padding`, `width`, `height`) задаются пользователем, поэтому идут через `:style`. Они формируются **только** функциями `styleEntries()` + `toStyleObject()` / `toInlineStyle()` из `scripts/pages/canvas/node-style.ts`. Ту же функцию использует экспорт. Оформление редактора (цвет по глубине вложенности, подпись, выделение, подсветка при перетаскивании) делается BEM-классами через `outline`, `box-shadow` и наложенные слои, **никогда не через `border`, `margin` или `padding`**: иначе превью разойдётся с экспортом.

Динамические стили камеры канваса тоже идут через `:style`: `transform` и переменная `--camera-zoom` (для обратного масштаба подписей) слоя `canvas-viewport__world` и `background-position` / `background-size` у `.canvas-viewport`. Они формируются **только** функциями из `scripts/pages/canvas/camera-style.ts`. Так же через `:style` задаются позиция и ширина превью корня на поле (`rootPlacementStyle()` из `node-view.ts`) и прямоугольники оверлея выделения (`overlayRectStyle()` из `selection.ts`). Всё остальное оформление поля — BEM-классы.

Координаты всплывающих списков (выпадашки, селекты), которые рендерятся с `position: fixed` поверх панелей, задаются через `:style` **только** функцией `popupStyle()` из `scripts/globals/popup.ts` (или её будущими общими аналогами в `scripts/globals/`). Всё остальное оформление списка — BEM-классы.

---

## 5. Vue

1. Только Composition API и `<script setup lang="ts">`.
2. Порядок в `.vue`-файле: комментарий-шапка, `<template>`, `<script setup>`. Блока `<style>` нет.
3. В `<script setup>` только «проводка»: импорты, `defineProps` / `defineEmits` / `defineModel` с типами из `scripts/.../<имя>.types.ts`, вызов composable и передача результата в шаблон. Логика длиннее нескольких строк уходит в `scripts/.../use-<имя>.ts`.
   ```vue
   <!-- Общая кнопка: варианты, размер, иконка -->
   <template>
     <button :class="classes" :type="type" :disabled="disabled" @click="emit('click', $event)">
       <slot />
     </button>
   </template>

   <script setup lang="ts">
   import type { UiButtonProps, UiButtonEmits } from '@/scripts/components/ui-button/ui-button.types'
   import { useUiButton } from '@/scripts/components/ui-button/use-ui-button'

   const props = withDefaults(defineProps<UiButtonProps>(), { variant: 'default', size: 'm', type: 'button' })
   const emit = defineEmits<UiButtonEmits>()
   const { classes } = useUiButton(props)
   </script>
   ```
4. Данные передаются вниз через пропсы, события поднимаются вверх через emit. Для полей ввода используется `defineModel`.
5. Pinia-хранилище нужно только для данных, которые нужны нескольким фрагментам (дерево, выделение, история). Локальное состояние UI живёт в composable компонента.
6. Компонент не обращается к хранилищу, если он общий (`Ui*`): общие компоненты знают только свои пропсы. Хранилище используют фрагменты страниц.
7. `v-for` всегда с `:key` по стабильному id (`node.id`), не по индексу.
8. Прямая работа с DOM разрешена только в `scripts/` (dnd, хоткеи, измерения) через template refs. `document.querySelector` в компонентах запрещён.
9. Классы в шаблоне задаются через вычисляемый массив или объект из composable, без длинных выражений в шаблоне.

---

## 6. TypeScript

1. `strict: true`, `noUncheckedIndexedAccess: true`. `any` запрещён: используйте `unknown` и сужение типов.
2. Только именованные экспорты. `export default` допустим только в конфигах.
3. Импорты идут через алиасы: `@/` → `src/`, `@shared` → `shared/src`. Относительные пути разрешены только внутри одной папки (`./types`).
4. **Чистая логика отделена от Vue.** Операции над деревом, генерация стилей и HTML, геометрия перетаскивания — это чистые функции без импорта Vue и Pinia. Каждая из них покрыта тестами Vitest в `__tests__/` рядом.
5. Операции над деревом не мутируют вход, а возвращают новое дерево. На этом построен undo/redo.
6. Магические строки и числа запрещены: всё выносится в `constants.ts` (глобальные в `scripts/globals/`, страничные в папку страницы).
7. Функция делает одно дело. Если она длиннее ~40 строк, её нужно разбить.
8. Работа с `localStorage`, файлами и сетью оборачивается в `try/catch` с понятной ошибкой для пользователя.
9. Данные извне (импорт `.json`, ответ API, `localStorage`) проверяются zod-схемой из `@shared` перед использованием.

---

## 7. Комментарии

Язык комментариев — русский.

1. **Каждый файл начинается с краткого пояснения** (1–3 строки), для чего он нужен:
   - `.ts`: `/** Чистые операции над деревом блоков: поиск, добавление, удаление, перемещение. */`
   - `.vue`: `<!-- Фрагмент страницы canvas: панель слоёв с деревом блоков -->`
   - `.scss`: `// Стили фрагмента canvas-toolbar: верхняя панель инструментов`
2. **Каждая функция** (включая функции внутри composable, экшены хранилища и миксины SCSS) описывается кратким JSDoc-комментарием над ней:
   ```ts
   /** Перемещает узел к новому родителю на указанную позицию; возвращает новое дерево. */
   export function moveNode(tree: LayoutNode, nodeId: string, parentId: string, index: number): LayoutNode {
   ```
3. Исключение: в JSON-файлах (`package.json`, `tsconfig.json`) комментариев нет. Назначение `package.json` описывается полем `description`.
4. Комментарии объясняют «зачем», а не пересказывают код. Неочевидные решения (геометрия dnd, обход граничных случаев) комментируются обязательно.

---

## 8. Чеклист: добавить общий компонент

1. `views/components/<kebab>/Ui<Name>.vue` с шапкой-комментарием.
2. `scripts/components/<kebab>/<kebab>.types.ts` с пропсами и событиями (+ `use-<kebab>.ts`, если есть логика).
3. `styles/components/_<kebab>.scss`: BEM-блок `.<kebab>`, шапка-комментарий.
4. `@use 'components/<kebab>';` в `_index.scss` каждой страницы и в файле каждой модалки, где он используется.

## 9. Чеклист: добавить фрагмент страницы

1. `views/pages/<page>/<Page><Fragment>.vue`.
2. Логика в `scripts/pages/<page>/use-<page>-<fragment>.ts` (если есть).
3. `styles/pages/<page>/_<page>-<fragment>.scss` + `@use` в `styles/pages/<page>/_index.scss`.
4. Подключить фрагмент в оркестратор `<Page>Page.vue`.

## 10. Темы и экран

1. Тем две: светлая и тёмная. **Каждый новый элемент сразу оформляется и проверяется в обеих.**
2. Значения цветов обеих тем лежат в `_variables.scss` двумя картами с одинаковыми ключами (`$theme-light`, `$theme-dark`). `_globals.scss` выводит их CSS-переменными `--color-<ключ>` на `:root[data-theme='light']` и `:root[data-theme='dark']`. Это единственное место, где разрешён селектор по атрибуту.
3. Новый цвет добавляется сразу в **обе** карты. Ключ, который есть только в одной карте, считается ошибкой.
4. Цвета блоков, которые выбирает пользователь (палитра превью), тоже подбираются так, чтобы подпись читалась в обеих темах.
5. Шрифты подключаются только через переменные `$font-ui` и `$font-mono` в `_variables.scss`. Текущие шрифты временные, при замене правится одно место.
6. Минимальная ширина экрана — ноутбук (1366px). Адаптив под планшет и телефон не делаем.

## 11. Готовность итерации

Итерация считается завершённой, только если:
- `npm run check` из корня проходит без ошибок: Prettier `--check`, Stylelint, `vue-tsc`, ESLint и Vitest;
- у всех новых файлов и функций есть комментарии;
- [руководство пользователя](../USER_GUIDE.md) описывает каждое новое или изменённое действие (что нажать, куда смотреть), все новые горячие клавиши внесены в таблицу, готовые разделы помечены ✅;
- в `docs/PLAN.md` отмечен пункт и добавлена короткая заметка, если что-то отклонилось от плана.

Что проверяется автоматически, а что остаётся на ревью:
- **автоматически** (`npm run check`): `any`, default-экспорты, `../`-импорты, `<style>` и порядок блоков в `.vue`, `<script setup lang="ts">`, многословные имена компонентов, `v-for` с `:key`, `document.querySelector` и похожие методы в `.vue`, статичный `style=""`, JSDoc у функций, наличие шапки (`.ts/.js/.vue/.scss`; в `.ts/.js` шапка не должна прилегать к первому statement, иначе это JSDoc функции и шапки нет), тип файла по папке `views/`/`scripts/`, BEM-паттерн классов (написанных целиком и собранных через `&__`/`&--`/`#{$b}__`, включая запрет элемента элемента), id-, тег- и атрибут-селекторы, `!important`, вложенность больше 3, `@import`, `@use … as *`, hex, именованные цвета и цветовые функции (`rgb()`, `hsl()` и др.) вне `_variables.scss`, форматирование (Prettier, исправляется `npm run format`), тесты только в `__tests__/`;
- **только на ревью**: длина функции (~40 строк), магические числа и строки, `:key` по индексу, именование файлов и папок (kebab/Pascal), чистая логика без Vue и Pinia, `UPPER_SNAKE_CASE` констант, классы через computed, `Ui*` без хранилища, содержательность шапок, JSDoc у SCSS-миксинов, `@extend` между файлами, отсутствие CSS-вывода в `_variables`/`_mixins`.
