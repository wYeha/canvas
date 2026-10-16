# Итерация 7.6 — индикация и drop

## Цель и контекст

Завершить перетаскивание **узла** (`session.kind === 'node'`) на канвасе: пока тянут — **подсветка блока-приёмника** и **линия вставки** по уже считающемуся `dropTarget.index` (7.4 flex, 7.5 grid); при отпускании — **`layoutStore.moveNode`** с целью `child` или `canvas` (как сейчас) + один шаг истории. Отмена (`Esc`, `dropDenied`, `index === null` над блоком) — без записи.

Опора: `dnd/drag-store.ts`, `dnd/use-drop-target.ts` (`refreshTarget`, `insertIndexIn`, `nodeDropMove` только canvas), `dnd/use-canvas-dnd.ts` (`releaseMove` → `moveNode`), `dnd/dnd-style.ts` (`dragGhostStyle`), `tree-move.ts` (`moveNode` / «то же место» → тот же `doc` → `commit` false), `use-canvas-node.ts`, `CanvasViewport.vue`, `CanvasDragGhost.vue`, `_canvas-node.scss`, `_canvas-viewport.scss`, уроки DnD в `.claude/rules/agent-workflow.md`, DESIGN (приёмник, линия, след), `--alpha-drop-fill` в `_variables.scss` / TOKENS.

**Не входит:** слои 7.7, `Alt`/автопан 7.8, смена правила «самый глубокий блок под курсором» (зоны у края ребёнка = вставка у родителя — см. открытый вопрос 1).

## Чеклист (worker)

- [x] **Drop при отпускании:** расширить `nodeDropMove` в `use-drop-target.ts`: при `dropTarget.kind === 'block'` и `index !== null` → `{ type: 'child', parentId, index }`; `canvas` — без изменений (`canvasMoveTarget`); иначе `null`. Тип возврата — `MoveTarget | null` (не только `CanvasMove`). Юнит-тесты в новом файле или рядом с `drop-target` / отдельный `use-drop-target` test (чистая обёртка — вынести `releaseNodeTarget(session, dropTarget, pointer, camera, doc)` в `dnd/dnd-release.ts` без Vue, если иначе не тестируется).
- [x] **`use-canvas-dnd.ts`:** шапка/JSDoc — перенос внутрь блока; `releaseMove` без смены контракта (уже зовёт `nodeDropMove`).
- [x] **Подсветка приёмника (BEM):** в `use-canvas-node.ts` булев `isDropReceiver` (отдельный computed): `draggingId !== null`, `dropTarget?.kind === 'block'`, `dropTarget.id === node.id`. Класс `canvas-node--drop-target` в `classes`. Стили в `_canvas-node.scss`: пунктир акцентом + заливка через `color-mix` и `var(--alpha-drop-fill)` (как DESIGN; **не** `border`/`padding` — §4.4 frontend.md). Не путать с `--drag-source` на перетаскиваемом узле.
- [x] **Линия вставки — геометрия:** новый чистый модуль `dnd/insert-line.ts` + тесты `dnd/__tests__/insert-line.test.ts`.
- [x] **Линия вставки — UI:** фрагмент `CanvasDropInsert.vue` + `use-canvas-drop-insert.ts` + `_canvas-drop-insert.scss`; подключить в `CanvasViewport.vue` (между `CanvasSelection` и `CanvasDragGhost`, как призрак — sibling viewport, не внутри мира). `pointer-events: none`, `aria-hidden="true"`, z-index как у призрака (`$z-port`) или чуть ниже — линия под призраком, над блоками.
- [x] **`dnd-style.ts`:** `dropInsertLineStyle(rect: Rect)` (положение/размер сегмента в **экранных px viewport**, как `dragGhostStyle`). Точки на концах — псевдоэлементы в SCSS. При необходимости константы толщины/кружков — `constants.ts` + TOKENS.md + `_variables.scss`.
- [x] **§4.4 frontend.md:** дописать `dropInsertLineStyle` (и имя функции, если иное) в список исключений `dnd-style.ts` — **после согласования с пользователем**, если правило требует явного OK (как для 7.1).
- [x] **DOM-тесты** `canvas-dnd.dom.test.ts`: отпускание над flex/grid с валидным `index` → документ меняется, один `moveNode`; отпускание «на место» (тот же родитель/индекс) → документ тот же; `dropDenied` / `index: null` / панель — без изменений; при необходимости снапшот класса `canvas-node--drop-target` / наличие `.canvas-drop-insert`.
- [x] **USER_GUIDE:** раздел «Перетащить» — ✅ перенос внутрь, линия, подсветка; убрать «появится позже» / черновые оговорки в пунктах 106–110; кратко «в другой корневой» если поведение уже как у любого блока.
- [x] **PLAN.md:** `[x]` 7.6 + заметка; `npm run format`, `npm run check`; браузер демо, обе темы; саморевью; коммит `7.6: индикация drop и перенос в блок` (родитель).

## Архитектурные решения

### 1. Отпускание (единая точка — `nodeDropMove` / чистый helper)

| `dropTarget` | Действие |
|---|---|
| `null` | no-op |
| `{ kind: 'canvas' }` | `canvasMoveTarget(...)` — как 7.3 |
| `{ kind: 'block', index: null }` | no-op (не отрисован / нет индекса) |
| `{ kind: 'block', index: number }` | `{ type: 'child', parentId: id, index }` |

Перед `moveNode` не дублировать `canMoveNode`: приёмник уже прошёл проверку в `resolveDropTarget`; при отпускании пересчитать `refreshTarget` (уже есть в `onPointerUp`). `tree.moveNode` сам отсекает «то же место» — история не растёт (`commit` false).

Корень за заголовок (`kind: 'root'`) — без изменений, `dropTarget` не используется.

### 2. Подсветка приёмника — только BEM на `canvas-node`

Состояние не в Pinia, не через `:style` рамки блока (превью/экспорт). Один модификатор на **блоке-приёмнике** (`dropTarget.id`). Для вложенного приёмника подсвечивается он, не родитель. При `dropDenied` приёмника нет — класс ни на ком.

### 3. Линия вставки — чистая геометрия + оверлей viewport

**Решение:** позиция линии — **отдельные чистые функции с unit-тестами** (как `flexInsertIndex` / `gridInsertIndex`), не дублировать логику выбора индекса.

**Вход `insertLineRect` (имя уточнить в коде):**

- `container`: `flex` (`direction`, `wrap`) или `grid`;
- `rects`: прямые дети приёмника в порядке DOM (`measureChildClientRects`), те же `client`, что у `insertIndexIn`;
- `index`: `0..rects.length` из `dropTarget`;
- опционально `parentRect`: `getBoundingClientRect` элемента приёмника — для пустого контейнера и краев без соседей.

**Выход:** `Rect | null` в **client**-координатах (сегмент «полосы» линии: для `row` — вертикальная полоса в зазоре между соседями, высота ≈ высота строки/линии flex; для `column` — горизонтальная; для grid — по оси потока X, поперечный размер по ближайшим детям строки, согласовано с 7.5).

**Алгоритм (MVP, без нового hit-test):**

- `index === 0`: линия у **начала потока** — между левым/верхним краем content box приёмника и первым не-null ребёнком (или по центру приёмника, если детей нет / все `null`).
- `index === n` (после последнего): симметрично у конца потока.
- `0 < index < n`: середина зазора между `rects[index-1]` и `rects[index]` по главной оси; по поперечной — пересечение полосы линий (для wrap — линия той же flex-линии, что и у `flexInsertIndex` для этого индекса: переиспользовать `flexFlow` / разбиение на линии из `flex-insert.ts`, **экспортировать** минимально нужное или вынести общий `flex-lines.ts`, чтобы не копировать `splitLines`).

Grid: линия между позициями `index-1` и `index` по правилу «до/после ближайшего» (ось X); на краях строки — от края ребёнка до зазора с соседом по X.

**Интеграция UI:** `use-canvas-drop-insert` читает `dragStore.dropTarget` + `draggingId`; если `block` и `index !== null` — замер через `node-dom` + `findNode` + `insertLineRect` → `toViewportPoint` относительно `viewportEl.getBoundingClientRect()` (как `use-canvas-dnd` кеширует `origin` на жест; здесь — computed при `dropTarget` / камере / документе, `flush: 'post'` уже есть на приёмнике). Показывать линию только при `session.kind === 'node'`.

**Не показывать линию:** `index === null`, `canvas`, `dropDenied`.

### 4. Производительность

- Класс приёмника: отдельный булев computed на узел (как `isDragSource`).
- Линия: один оверлей; computed зависит от `dropTarget` (ид + index), камеры, документа — не от каждого пикселя `pointer`, если `setDropTarget` не писал стор (уже так в 7.4).
- Двойной `measureChildClientRects` на кадр (приёмник + линия): допустимо для MVP; при ревью — опционально кеш в `use-drop-target` (не обязательно в 7.6).

### 5. Координаты и оверлеи

Все новые оверлеи — `pointer-events: none`. Шапка `node-dom.ts` уже предупреждает про линию/рамку — проверить после добавления `CanvasDropInsert`.

## Риски и митигации

| Риск | Митигация |
|---|---|
| Линия не совпадает с фактической вставкой | Те же `rects`, `index`, оси, что у `flexInsertIndex` / `gridInsertIndex`; общие тестовые фикстуры прямоугольников |
| Линия «прыгает» при wrap / большом gap | MVP как в 7.4–7.5; краевые случаи в unit-тестах; браузер на демо |
| `commit` лишний шаг при «на место» | Полагаться на `moveToChild` / `sameParentIndex`; DOM-тест |
| Двойной замер DOM тормозит | Только прямые дети одного приёмника; не обходить дерево |
| Нарушение §4.4 (`:style` вне списка) | Только `dnd-style.ts`; рамка приёмника — BEM |
| Регресс `elementFromPoint` | `pointer-events: none` на линии; не класть линию в слой мира с hit-test |
| Reviewer: функции > 40 строк | Дробить `insert-line.ts` (flex/grid отдельно), composable — тонкая обёртка |

## Затронутые файлы (ожидаемо)

| Файл | Изменение |
|---|---|
| `dnd/use-drop-target.ts` | `nodeDropMove` → `child` |
| `dnd/dnd-release.ts` (опционально) | чистая цель отпускания |
| `dnd/insert-line.ts` | **новый** |
| `dnd/dnd-style.ts` | `dropInsertLineStyle` |
| `dnd/flex-insert.ts` | возможно экспорт линий / общий хелпер |
| `use-canvas-node.ts`, `_canvas-node.scss` | `--drop-target` |
| `CanvasDropInsert.vue`, `use-canvas-drop-insert.ts`, `_canvas-drop-insert.scss` | **новые** |
| `CanvasViewport.vue`, `_index.scss` | подключение |
| `use-canvas-dnd.ts` | комментарии |
| `docs/USER_GUIDE.md`, `docs/PLAN.md` | ✅ |
| `docs/TOKENS.md`, `_variables.scss`, `constants.ts` | при новых размерах линии |
| `docs/rules/frontend.md` §4.4 | при новой функции стиля |
| `dnd/__tests__/insert-line.test.ts`, `canvas-dnd.dom.test.ts` | тесты |

## Открытые вопросы (решить до или в начале реализации)

1. **Зоны «у края ребёнка» (7.4/7.5 отложено).**  
   - **A (рекомендация для 7.6):** не менять `resolveDropTarget`; пользователь целится в padding/gap приёмника; над телом ребёнка приёмник — ребёнок (как сейчас). Зафиксировать в заметке PLAN.  
   - **B:** расширить hit-test (полоса по краю AABB ребёнка → приёмник родитель с индексом рядом) — отдельная подзадача, риск регрессий 7.3.

2. **Пустой flex/grid и `index === rects.length` при одном `skip`.**  
   - **A:** линия у края content box приёмника (`parentRect`).  
   - **B:** не рисовать линию, только подсветку (хуже UX). Рекомендация: **A**.

3. **«В другой корневой блок» в USER_GUIDE.**  
   - **A:** описать как обычный блок-приёмник (уже так в 7.3).  
   - **B:** отдельный подпункт позже. Рекомендация: **A** в 7.6.

4. **§4.4:** достаточно ли одной `dropInsertLineStyle`, или нужна вторая функция под «точки» (если точки не pure CSS). Рекомендация: точки в SCSS (`::before`/`::after`), одна функция для полосы.

## Критерии готовности

- Визуально: приёмник с пунктиром и заливкой; линия с точками; след и призрак без изменений поведения.
- Отпускание: child / canvas / no-op по таблице выше; undo одним шагом.
- `npm run check` зелёный; USER_GUIDE и PLAN обновлены; браузер — обе темы.

## Риски для reviewer (фокус)

- Утечки: только computed/watch, без лишних window-слушателей.
- Согласованность индекса линии и `moveNode` (до изъятия, `skip` не ломает геометрию линии — линия по **целевому** `index`, rects без skip или с skip как в insert).
- Нет `:style` на `canvas-node` для drop.
- JSDoc на всех новых экспортах; шапки файлов.
- Не затронуты 7.7/7.8 (слои, Alt).

---

Путь к плану для worker: `.claude/plans/2026-10-16-21-15-iteration-7-6-drop-indication.md`
