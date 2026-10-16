# Итерация 7.7 — перетаскивание в панели «Слои»

## Цель и контекст

Реализовать **перетаскивание строк** в панели «Слои»: вставка **до**, **после** и **внутрь** блока по **зонам строки** (верхняя / средняя / нижняя треть), в том числе **перестановка корневых блоков** в порядке `roots`. При отпускании — **`layoutStore.moveNode`** + один шаг истории; отмена `Esc` без записи. Свои **pointer events**, без библиотек.

Опора: DESIGN.md (трети строки, линия с отступом по уровню, след, запрет в себя/потомков, красный призрак), USER_GUIDE («Слои», «Перетащить»), `layers.ts` / `use-canvas-layers.ts` / `CanvasLayerItem.vue`, канвасный DnD 7.1–7.6 (`drag-store`, `use-canvas-dnd`, `tree-move`, `canMoveNode`) — **не смешивать** сессии без явной архитектуры. Уроки: composable панели + provide/inject, порог 4px, `keepFocusOnMouseDown`, блокировка хоткеев, ховер строк — один `pointermove` на viewport (`layerIdFromTarget`), `:style` только через разрешённые функции.

**Не входит:** Alt-копия и автопан 7.8; перетаскивание на канвасе (поведение не менять); автраскрытие ветки при наведении на свёрнутый блок.

**Граница с 7.6:** логика `drop-target` / `flexInsertIndex` / `gridInsertIndex` на поле **не используется** в слоях — там своя геометрия «строка дерева», общий только **`moveNode` / `canMoveNode`**.

---

## Чеклист (worker)

### 1. Чистая логика (unit-тесты обязательны)

- [x] Новый модуль `scripts/pages/canvas/layers-drop.ts` (+ `layers-drop.constants.ts` или константы в `constants.ts`: доли третей, толщина линии, отступ = `$layer-indent` в px — **дублировать число 12** с комментарием «как SCSS `$layer-indent`», либо вынести в `constants.ts` уже существующий паттерн).
- [x] `layerDropZone(localY: number, rowHeight: number): 'before' | 'inside' | 'after'` — по DESIGN: `y < h/3`, `y > 2h/3`, иначе `inside`; границы ровно на третях — зафиксировать в тесте (например, `inside` на `[h/3, 2h/3)`).
- [x] `isLayersDropForbidden(doc, draggedId, overId): boolean` — `overId === draggedId` или `isDescendant(doc, draggedId, overId)`.
- [x] `layersMoveTarget(doc, draggedId, overId, zone): MoveTarget | null`:
  - сначала `isLayersDropForbidden` → `null`;
  - `zone === 'inside'`: только `block`, не `link`; `{ type: 'child', parentId: overId, index: children.length }` (см. открытый вопрос 2);
  - `zone === 'before' | 'after'`: вставка **на том же уровне**, что строка `overId` (как сосед):
    - **корень** (`findParent` нет): `{ type: 'canvas', at: текущий canvas корня overId, rootIndex: ... }` — тот же приём, что `rootMoveTarget` в `node-actions.ts` (сохранить x/y/width, меняется только `rootIndex`);
    - **вложенный**: `{ type: 'child', parentId: parent.id, index }` — `index` = индекс `overId` среди детей (`before`) или `index + 1` (`after`), в координатах **до изъятия** (как у `moveNode`);
  - финальная проверка `canMoveNode(doc, draggedId, target) === null`, иначе `null`.
- [x] `layersDropAllowed(doc, draggedId, overId, zone): boolean` — `layersMoveTarget(...) !== null` (для приглушения строк и красного призрака).
- [x] Тесты `__tests__/layers-drop.test.ts`: фикстура `makeDoc()` — перестановка `a1`/`a2` внутри `A`, вынос `a1x` «после» `B` (корень), перестановка корней `A`/`C`, запрет в потомка и в себя, `inside` в `link`, `inside` в `grid`, «то же место» → target даёт no-op через `moveNode` (документ тот же).
- [ ] Опционально: `visibleLayerRowIds(doc, collapsed)` — не делали (MVP) — DFS с пропуском свёрнутых детей; пригодится для тестов «между корнями» и для DOM; если логика цели только через `overId`+`zone`, список не обязателен для MVP.

### 2. Сессия перетаскивания (composable, не Pinia drag-store)

- [x] **`use-canvas-layers-dnd.ts`** — pointer lifecycle на контейнере списка (см. п. 3).
- [x] **`layers-drag-state.ts`** — минимальный модуль без Vue: `ref`/`shallowRef` `isLayersDragging`, `draggingId`, `dropOver` (`{ overId, zone } | null`), `dropDenied` (есть жест, но `layersMoveTarget === null` при текущем `dropOver`). Composable пишет сюда; **hotkeys** и при необходимости **select** читают `isLayersDragging` (как `labelEdit`, не новый Pinia).
- [x] **Обоснование (зафиксировать в заметке PLAN):** расширять `drag-store` сессией `kind: 'layer'` **не рекомендуется** — другая геометрия (трети строки, без world grab / `dropTarget` канваса), риск пересечения с `use-canvas-dnd` и лишних пробуждений узлов канваса. Взаимоисключение жестов: канвас DnD слушает только `isSurface` (мир), слои — только панель. Единая точка для хоткеев — флаг `isLayersDragging` в тонком модуле.

### 3. События указателя

- [x] Подключить в `use-canvas-layers.ts` (после `provide` контекста): ref на `.canvas-layers__list` или обёртку панели, вызов `useCanvasLayersDnd(listEl, collapsed)`.
- [x] **Старт:** `pointerdown` на строке (`data-layer-id` на `.canvas-layer-item__row`), **не** на шевроне, **не** в поле переименования, не при `labelEdit` в этой строке; ЛКМ, порог `CLICK_DRAG_THRESHOLD` 4px; `labelEdit.finish()` как в `activate`.
- [x] После порога: `setPointerCapture` на элемент списка (или panel scroll container), `isLayersDragging = true`, выделить перетаскиваемый узел (`layoutStore.select`).
- [x] **Движение:** `clientY` относительно `getBoundingClientRect` строки под курсором (`elementFromPoint` + `layerIdFromTarget` / closest `[data-layer-id]`); обновлять `dropOver` только при смене пары `(overId, zone)` (как `setDropTarget` на канвасе).
- [x] **Отпускание:** `layersMoveTarget` → `layoutStore.moveNode`; если `null` или `moveNode` вернул `commit: false` — no-op; снять capture, сброс состояния.
- [x] **Esc:** capture на `window`, как `use-canvas-dnd.ts`; отмена без `moveNode`.
- [x] **Потеря capture / `pointercancel` / `visibilitychange`:** сброс.
- [x] После успешного drag **не** вызывать `activate` (клик не должен срабатывать) — флаг «был drag» на pointerup.
- [x] `onBeforeUnmount` — снять слушатели.

### 4. Визуал (BEM + разрешённые `:style`)

- [x] **След:** модификатор `canvas-layer-item__row--drag-source` на строке `draggingId` (пунктир/прозрачность — по аналогии `$drag-source-opacity` / токен; при необходимости новый `--alpha-layer-drag-source` в TOKENS + обе темы).
- [x] **Внутрь:** `canvas-layer-item__row--drop-inside` на `dropOver.overId` при `zone === 'inside'` и разрешённом drop.
- [x] **Приглушение запрещённых:** `canvas-layer-item__row--drop-forbidden` на строках self/descendant перетаскиваемого (пока идёт жест) — DESIGN.
- [x] **Линия вставки** (только `before` / `after`, разрешённый drop): фрагмент `CanvasLayersDropLine.vue` + `use-canvas-layers-drop-line.ts` + `_canvas-layers-drop-line.scss`; позиция в **client** координатах относительно панели/списка; горизонтальный сегмент, **left** = отступ по `depth` строки-якоря (`depth` из props `CanvasLayerItem` или вычислить из `getPath(doc, overId).length - 1`).
- [x] **`:style`:** новый файл **`layers-drop-style.ts`** с `layerDropLineStyle(rect)` (и при необходимости `layerDragGhostStyle` — можно переиспользовать `dragGhostStyle` из `dnd-style.ts`, если контракт тот же `Rect` в px). **Дописать §4.4 `frontend.md`** (согласование с пользователем по правилам репозитория).
- [x] **Призрак:** `CanvasLayersDragGhost.vue` + composable — компактная карточка строки (значок + подпись), наклон/тень BEM; при `dropDenied` — модификатор `canvas-layers-drag-ghost--denied` (красный контур + иконка запрета, DESIGN). Координаты от `pointer` и замера строки при старте; **без зума камеры**.
- [x] Подключить оверлеи в `CanvasLayers.vue` (`pointer-events: none`, `aria-hidden`); z-index в пределах панели (`$z-*` из tokens).
- [x] Курсор: `grabbing` на панели во время жеста; `not-allowed` при `dropDenied` (класс на `.canvas-layers` или список).

### 5. Интеграция строк

- [x] Расширить `CANVAS_LAYERS_CONTEXT` или отдельный inject `LAYERS_DND_CONTEXT` — `draggingId`, `dropOver`, `dropDenied`, хелперы классов (чтобы `use-canvas-layer-item` не тянул глобальный ref напрямую).
- [x] `layerRowClasses` в `layers.ts` — опционально расширить `LayerRowState` флагами drag/drop (чистые классы в тестах).
- [x] `CanvasLayerItem.vue`: `pointerdown` на `__row` делегировать composable (осторожно с кнопкой `__select` — один обработчик на row).

### 6. Хоткеи и ховер

- [x] `use-canvas-hotkeys.ts`: блокировать команды при `isLayersDragging` (как `dragStore.isDragging`).
- [x] `use-canvas-select.ts`: при `isLayersDragging` не начинать новое выделение на viewport (по аналогии с `dragStore.isDragging`); ховер слоёв во время жеста можно оставить или заморозить — **рекомендация:** обновлять hover только для `dropOver` (опционально, не блокер).

### 7. Документация и проверки

- [x] **USER_GUIDE:** панель «Слои» — убрать «перетаскивание позже»; раздел «Перетащить» — подпункт «В «Слоях»» ✅ (трети, линия, внутрь, отмена Esc, история); сводная строка в начале раздела.
- [x] **PLAN.md:** `[x]` 7.7 + заметка (файлы, решение про composable vs drag-store).
- [x] **DOM-тесты** `canvas-layers.dom.test.ts`: симуляция pointer (down → move >4px → up) — смена порядка детей или корней; `Esc` — без изменений; запрет drop на потомка (документ тот же).
- [x] `npm run format`, `npm run check`; браузер `?demo`, обе темы; саморевью по чеклисту agent-workflow.

---

## Архитектурные решения

### A. Цель `MoveTarget` из строки (единая с канвасом)

| Зона | Уровень строки `overId` | `MoveTarget` |
|------|-------------------------|--------------|
| `inside` | блок | `child`, `parentId = overId`, `index = len(children)` |
| `before` / `after` | корень | `canvas`, `at` = текущий canvas, `rootIndex` = индекс корня / +1 |
| `before` / `after` | ребёнок блока | `child`, `parentId = parent.id`, `index` по позиции `overId` |

Перестановка только порядка в «Слоях» **не двигает** корень по полю (x/y те же) — как кнопки «Выше/Ниже» для корня.

Связь (`link`): **внутрь** запрещено (`parent-is-link`); **до/после** среди соседей того же родителя — как у блока. На канвас связь не выносим.

### B. Сессия: composable + `layers-drag-state.ts`, не `drag-store`

См. чеклист п. 2. `drag-store.isDragging` остаётся только для канваса; хоткеи проверяют **оба** флага.

### C. Индикаторы

- Линия — только `before`/`after` и валидный target; **inside** — подсветка строки, без линии (DESIGN).
- Геометрия линии — чистая функция `layerDropLineRect(rowRect, zone, depth)` + unit-тесты (отступ слева, `top` на границе before/after).

### D. Производительность

- Не пересчитывать `layersMoveTarget` на каждый px: кешировать `(overId, zone)` в composable.
- Классы строк — булевы computed на строку (`isDragSource`, `isDropInside`, `isForbidden`).

---

## Риски и митигации

| Риск | Митигация |
|------|-----------|
| Расхождение индекса и `moveNode` | Те же правила, что `node-actions` / комментарии в `tree-move.ts`; тесты на `before`/`after` с изъятием из того же родителя |
| Клик vs drag на `__select` | Порог 4px + suppress click после drag |
| `blur` / переименование при drag | `finish()` на старте; не начинать drag в режиме rename |
| Фокус и `keepFocusOnMouseDown` | Старт drag с row, не ломать F2 |
| Двойная сессия канвас+слои | Разные поверхности; при желании guard: не начинать layers если `dragStore.isDragging` |
| `elementFromPoint` в тестах | По образцу `canvas-dnd.dom.test.ts` |
| §4.4 | Отдельный `layers-drop-style.ts`, запись в frontend.md |
| Свёрнутая ветка | Drop `inside` на родителя с детьми валиден в документе даже если дети скрыты |
| Reviewer: функции >40 строк | Дробить `layers-drop.ts` (`rootSiblingTarget`, `childSiblingTarget`) |

---

## Затронутые файлы (ожидаемо)

| Файл | Изменение |
|------|-----------|
| `layers-drop.ts`, `layers-drop-style.ts`, `layers-drag-state.ts` | **новые** |
| `use-canvas-layers-dnd.ts`, `use-canvas-layers-drop-line.ts`, `use-canvas-layers-drag-ghost.ts` | **новые** |
| `CanvasLayers.vue`, `CanvasLayersDropLine.vue`, `CanvasLayersDragGhost.vue` | разметка оверлеев |
| `use-canvas-layers.ts`, `use-canvas-layer-item.ts`, `layers.ts` | контекст, классы |
| `CanvasLayerItem.vue`, `_canvas-layer-item.scss`, `_canvas-layers.scss` | жесты, модификаторы |
| `use-canvas-hotkeys.ts`, `use-canvas-select.ts` | блокировки |
| `constants.ts`, TOKENS, `_variables.scss` | при новых размерах/альфах |
| `docs/USER_GUIDE.md`, `docs/PLAN.md`, `docs/rules/frontend.md` §4.4 | документация |
| `__tests__/layers-drop.test.ts`, `canvas-layers.dom.test.ts` | тесты |

**Не трогать без необходимости:** `dnd/use-canvas-dnd.ts`, `drop-target.ts`, `insert-line.ts`.

---

## Открытые вопросы (варианты)

1. **`inside` — индекс 0 или в конец?**  
   - **A (рекомендация):** последний ребёнок (`children.length`), как вставка paste «последним».  
   - **B:** первый (`0`).  

2. **Стили `:style` — `layers-drop-style.ts` vs `dnd-style.ts`?**  
   - **A (рекомендация):** отдельный `layers-drop-style.ts` в `scripts/pages/canvas/` + пункт в §4.4 («индикаторы перетаскивания в Слоях»).  
   - **B:** расширить `dnd-style.ts` (смешивает канвас и панель).  

3. **Призрак — общий компонент или копия паттерна?**  
   - **A (рекомендация):** `CanvasLayersDragGhost` (узкая вёрстка строки, без world grab).  
   - **B:** параметризовать `CanvasDragGhost` (лишняя связность с камерой).  

4. **Прокрутка списка у краёв панели при удержании у верх/низ** — вне 7.8;  
   - **A:** не делать в 7.7;  
   - **B:** простой scrollBy при pointer у края (если успеете без риска).  

5. **Раскрытие ветки при `inside` на свёрнутом родителе**  
   - **A:** не раскрывать автоматически;  
   - **B:** `expandPath` на drop (лучше UX, +код).  

---

## Риски для reviewer

- Утечки слушателей `window` / capture; сброс при unmount панели.
- Гонки: undo/redo во время drag; удаление перетаскиваемого узла (редко — сброс жеста).
- Индекс корня при `before`/`after` с учётом `moveNode` после detach.
- Нет `:style` на строках кроме оверлеев; нет `querySelector` в `.vue`.
- JSDoc на всех экспортах; не заблокированы ли хоткеи навсегда при сбое `end()`.
- Связь не попадает в `inside`; корневой блок-источник связи — `canMoveNode` `source-into-block` при недопустимом `inside`.
- Не реализованы Alt / автопан (7.8).

---

## Критерии готовности

- В «Слоях» можно переставить соседей и вложить в блок; корни меняют порядок в списке и экспорте, не координаты на поле.
- Визуал: линия с отступом, подсветка «внутрь», след, призрак, красный при запрете.
- `npm run check` зелёный; USER_GUIDE и PLAN обновлены.

---

Путь к плану для worker: `.claude/plans/2026-10-16-22-00-iteration-7-7-layers-dnd.md`
