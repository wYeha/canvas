# Итерация 7.1 — ядро перетаскивания на канвасе

## Цель и контекст

Ядро DnD на pointer events без библиотек: состояние перетаскивания, порог 4px, призрак за курсором,
отмена по `Esc`, pointer capture, пересчёт координат с учётом зума камеры. Поиск приёмника (7.3),
вставка (7.4–7.5), линия вставки и drop с `moveNode` (7.6), перемещение корня за подпись (7.2),
«Слои» (7.7), `Alt` и автопанорамирование (7.8) — **не делаем**. В 7.1 отпускание просто завершает
перетаскивание без изменений документа.

Опора на существующее: `use-canvas-select.ts` (клик ≤ `CLICK_DRAG_THRESHOLD` = 4px выделяет, иначе нет),
`use-canvas-pan.ts` (пробел/средняя кнопка, pointer capture, сброс на blur/visibilitychange),
`use-canvas-hotkeys.ts` (глобальные, на window, `e.defaultPrevented`), `camera.ts` (`screenToWorld`),
`node-dom.ts` (`measureNodeWorldRect`, `nodeIdFromTarget`, `clientRectOf`).

## Чеклист

- [ ] `dnd/dnd-geometry.ts` (чистые): `isDragStart` (сдвиг > порога), `toViewportPoint`, `createGrab`
      (точка захвата и размер узла в координатах поля), `ghostRect` (экранный прямоугольник призрака
      по указателю и зуму, с ограничением размера и сохранением точки захвата под курсором).
- [ ] `dnd/dnd-style.ts`: `dragGhostStyle(rect)` — единственный источник `:style` призрака
      (исключение §4.4 — согласовать с пользователем).
- [ ] `dnd/drag-store.ts` (Pinia): `session` (id, захват, указатель), `draggingId`, `isDragging`,
      `begin` / `movePointer` / `end`. Нужен канвасу (след на месте), призраку, хоткеям, курсору viewport.
- [ ] `dnd/use-canvas-dnd.ts`: ожидание нажатия ЛКМ на блоке (`data-node-id`), старт после порога
      (захват указателя, выделение узла, сброс ховера и текстового выделения), движение, отпускание,
      `Esc` (keydown в capture-фазе), отмена на `pointercancel` / `lostpointercapture` / blur /
      скрытие вкладки / исчезновение узла из документа; снятие слушателей в `onBeforeUnmount`.
- [ ] Подключение в `use-canvas-viewport.ts` (после выделения), класс `canvas-viewport--dragging`
      (курсор `grabbing`, без выделения текста); ховер в `use-canvas-select.ts` не обновляется во время DnD.
- [ ] Хоткеи канваса заблокированы, пока идёт перетаскивание (`use-canvas-hotkeys.ts`).
- [ ] След на месте: модификатор `canvas-node--drag-source` (пунктир акцентом, приглушённое содержимое) —
      отдельный булев computed в `use-canvas-node.ts`, чтобы движение мыши не перерисовывало узлы.
- [ ] Фрагмент `CanvasDragGhost.vue` + `use-canvas-drag-ghost.ts` + `_canvas-drag-ghost.scss`:
      наклонённая копия (значок + подпись, цвет по глубине) с тенью, экранные координаты, `pointer-events: none`.
- [ ] Токены: TOKENS.md → `_variables.scss` (наклон, прозрачность призрака, максимум размера в constants.ts).
- [ ] Тесты: `dnd/__tests__/dnd-geometry.test.ts`, `dnd/__tests__/drag-store.test.ts`,
      DOM-тест призрака/следа (`dnd/__tests__/canvas-drag.dom.test.ts`).
- [ ] frontend.md §4.4 — исключение (после согласия), USER_GUIDE, PLAN `[x]` + заметка, браузер, коммит.

## Архитектурные решения

- **Координаты.** Сессия хранит точку захвата и размер узла **в координатах поля**, указатель —
  в экранных координатах viewport. Экранный прямоугольник призрака считается на лету из текущего зума:
  зум/пан колесом во время перетаскивания сразу пересчитывают призрак (точка захвата остаётся под курсором).
  Мировая точка указателя для 7.3 — `screenToWorld(camera, pointer)`.
- **Размер призрака** ограничен (`DRAG_GHOST_MAX` 320×200 экранных px) с сохранением пропорций:
  иначе корень 1440px закрывает экран. Точка захвата масштабируется тем же коэффициентом.
- **Pointer capture** берётся только после порога: если взять на `pointerdown`, `pointerup` придёт
  во viewport, и обычный клик по блоку снимал бы выделение (`use-canvas-select` берёт цель из события).
- **`preventDefault` на pointerdown не зовём** — иначе поле подписи не получит `blur`; выделение текста
  гасится классом `--dragging` и `removeAllRanges()` при старте.
- **Esc** ловится на window в capture-фазе с `preventDefault` + `stopPropagation`: хоткей
  «к родителю» не срабатывает. Остальные хоткеи заблокированы флагом стора (удаление/undo во время DnD невозможны).
- **Выделение.** Старт перетаскивания выделяет перетаскиваемый узел (свойства показывают, что тянем).
- **Состояние в Pinia** — его читают несколько фрагментов (узлы, призрак, viewport, хоткеи).
- **Заголовок корня** (`data-label-node-id` вне `data-node-id`) перетаскивание не начинает — это 7.2.

## Риски и митигации

- Конфликт с паном: старт только если не зажат пробел и не идёт пан; средняя кнопка не участвует.
- Конфликт с кликом/двойным кликом: до порога ничего не происходит; после порога клик не срабатывает
  (порог тот же, `CLICK_DRAG_THRESHOLD`).
- Залипание: сброс на `pointercancel`, `lostpointercapture`, blur, `visibilitychange`, размонтирование.
- Узел исчез во время DnD (не должно случиться — хоткеи заблокированы): watcher документа отменяет сессию.
- Производительность: на `pointermove` меняется только указатель в сторе → пересчитывается лишь стиль призрака;
  узлы зависят от булева `isDragSource`.

## Файлы

Новые: `scripts/pages/canvas/dnd/{dnd-geometry,dnd-style,drag-store,use-canvas-dnd}.ts`,
`scripts/pages/canvas/use-canvas-drag-ghost.ts`, `views/pages/canvas/CanvasDragGhost.vue`,
`styles/pages/canvas/_canvas-drag-ghost.scss`, тесты в `dnd/__tests__/`.
Изменяемые: `constants.ts`, `use-canvas-viewport.ts`, `use-canvas-select.ts`, `use-canvas-hotkeys.ts`,
`use-canvas-node.ts`, `CanvasNode.vue`, `CanvasViewport.vue`, `_canvas-node.scss`, `_canvas-viewport.scss`,
`_index.scss`, `_variables.scss`, `docs/TOKENS.md`, `docs/rules/frontend.md` (§4.4), `docs/USER_GUIDE.md`, `docs/PLAN.md`.
