# Итерация 7.8 — модификаторы DnD (Alt-копия, автопан)

## Цель и контекст

Завершить этап 7 перетаскивания: при отпускании с зажатым `Alt` — **копия** в цель drop вместо **переноса** исходника; во время перетаскивания на канвасе — **автопанорамирование**, когда курсор у края видимой области поля.

Опора: ядро 7.1–7.6 (`use-canvas-dnd.ts`, `use-drop-target.ts`, `dnd-release.ts`, `drag-store`, `insertIndexIn` + flex/grid), корень за заголовок (7.2), слои (7.7, отдельная сессия). Копирование по хоткеям: `prepareForPaste` / `pasteChild` / `pasteRoot`, `tree.duplicateNode` (дубль **рядом** с оригиналом — не то же, что drop-копия). Камера: `cameraStore.panBy`, `visibleArea` = `safeArea(viewport, CANVAS_SAFE_INSETS)`.

**Не входит в worker 7.8:** ревью всего этапа 7 (делает **родитель** после коммита 7.8: `git diff 0904142..HEAD`, чеклист из `agent-workflow.md`, при необходимости коммит `Этап 7: правки по ревью` и заметка `> Ревью этапа 7: ...` под пунктом 7.8 в `PLAN.md`). Автопрокрутка списка «Слои» у края панели (отложено с 7.7).

---

## Архитектурные решения (зафиксировано для worker)

### 1. Alt-копия — семантика

| Жест | Без Alt | С Alt при `pointerup` |
|------|---------|------------------------|
| Узел (`session.kind === 'node'`) | `layoutStore.moveNode(id, target)` | Вставить **клон** в `target`, исходник не трогать |
| Корень за заголовок (`kind === 'root'`) | `moveNode` на `{ type: 'canvas', at }` | Новый корень-копия в `at`, исходный корень на месте |

- **Момент:** решает только `e.altKey` на **`pointerup`** (как в `USER_GUIDE`: «зажать Alt перед отпусканием»). Дополнительно на **`pointermove`** при `e.altKey` обновлять режим превью (см. п. 2) — чтобы линия вставки во flex/grid не врала.
- **Валидация цели:** те же правила, что у переноса — `canMoveNode(doc, sourceId, target)` (связь на поле, корень-источник в блок и т.д.). Хит-тест и `resolveDropTarget` не менять.
- **Подготовка узла:** `findNode` → `prepareForPaste(doc, node)` (новые id, обрезка «висячих» связей). При `null` — no-op, как при запрещённом drop.
- **No-op как у переноса:** если для **переноса** цель дала бы тот же `doc` (то же место среди соседей, тот же `x/y/width` корня), при Alt-копии **тоже не писать** в документ (согласовано с «отпустить на том же месте — ничего не меняется»; отличие от `Ctrl+D` — осознанно).
- **История:** один `commit` на успешную копию; выделение — id **копии** (как `pasteChild` / `duplicateNode`).

### 2. Индекс вставки flex/grid при копии

В `insertIndexIn` сейчас `skip` = индекс перетаскиваемого ребёнка в родителе (чтобы превью совпадало с `moveNode` после detach). При **копии** исходник остаётся в DOM → **`skip` всегда `null`**.

Реализация: `refreshTarget(client, { forCopy: boolean })` / флаг в `drag-store` `dropForCopy`, обновлять на каждом `pointermove` из `e.altKey` (и на `pointerup` перед финальным `refreshTarget`). `targetAt` / `insertIndexIn` принимают `forCopy` и не передают `skip`, если `forCopy`.

**USER_GUIDE:** в пункте про Alt-копию уточнить, что при удержании Alt во flex/grid перетаскиваемый блок **учитывается** в расчёте места (в отличие от обычного переноса).

### 3. Слой дерева для drop-копии

Новая чистая функция (предпочтительно `tree-copy.ts` или блок в `tree-move.ts`, без Vue):

`copyNodeToTarget(doc, sourceId, target): { document: LayoutDocument; copyId: NodeId | null }`

- Проверка `canMoveNode`, `prepareForPaste`.
- Вставка **без** `detach`:
  - `child` → `addChild(doc, parentId, prepared, index)` с зажимом индекса как у `moveNode` (индекс в **текущем** списке детей, без сдвига «после изъятия»).
  - `canvas` → логика размещения как `attachCanvas` в `tree-move.ts` (ширина из `target.width`, корень / вложенный), через `addRoot` / обновление `roots` с нужным `rootIndex`, если цель это предусматривает.

Обёртка в `layout-store.ts`: `copyNodeToTarget(id, target): NodeId | null` — один `commit`, выделение копии.

`dnd-release.ts` **не менять** (по-прежнему только `MoveTarget` для переноса). Ветвление Alt — в `use-canvas-dnd.ts` `onPointerUp`.

### 4. Автопанорамирование

- **Когда:** только перетаскивание **на канвасе** (`dragStore.isDragging` и сессия в `drag-store`, не `isLayersDragging`).
- **Зона:** прямоугольник **`cameraStore.visibleArea`** (учёт `CANVAS_SAFE_INSETS`, не сырой viewport — иначе панель «Слои»/«Свойства» съедают зону). Полоса ширины **`DRAG_AUTOPAN_MARGIN_PX`** от каждого края **внутри** `visibleArea`.
- **Скорость:** чистая функция `dragAutopanDelta(client, visibleArea, margin, maxSpeed)` → `{ dx, dy }` (линейная шкала 0 у внутренней границы полосы → `maxSpeed` у внешнего края `visibleArea`; константы в `constants.ts`, при необходимости значения в `TOKENS.md`).
- **Цикл:** `requestAnimationFrame` в `use-canvas-dnd.ts` (или тонкий `use-drag-autopan.ts`): пока идёт drag и `delta ≠ 0`, вызывать `cameraStore.panBy(dx, dy)`; пересчёт приёмника — уже есть `watch(camera)` в `use-drop-target.ts`. На `stop()` / unmount — отменить rAF, снять утечки.
- **Координаты:** `client` — экранные (`clientX/Y`); сравнение с `visibleArea` как с `getBoundingClientRect`-подобным rect (x/y/width/height от `safeArea` + offset viewport при необходимости: **viewport origin** уже учтён в `visibleArea` относительно viewport элемента — сверить с тем, как в проекте задаётся `viewportSize`; при расхождении client vs viewport — использовать тот же origin, что в `toViewportPoint` / `clientRectOf(viewport)`).
- **Колесо во время drag** по-прежнему работает; автопан **дополняет**, не отключает ручной пан.

### 5. Визуальная обратная связь Alt (опционально, низкий приоритет)

Курсор «копия» или подпись в призраке — только если успевается без раздувания scope; иначе достаточно поведения и USER_GUIDE.

---

## Чеклист для worker

- [x] **Константы:** `DRAG_AUTOPAN_MARGIN_PX`, `DRAG_AUTOPAN_MAX_SPEED_PX` (+ TOKENS при новых числах).
- [x] **`dnd/drag-autopan.ts`** — чистый расчёт delta; тесты `dnd/__tests__/drag-autopan.test.ts`.
- [x] **`tree-copy.ts`** (или эквивалент) + `copyNodeToTarget`; тесты: `child` / `canvas`, отказ `canMoveNode`, no-op «то же место», связь/корень-источник, `prepareForPaste` → `null`.
- [x] **`layout-store`:** `copyNodeToTarget`; тест в `layout-store.test.ts`.
- [x] **`use-drop-target.ts`:** `forCopy` / `skip`; публичный API `refreshTarget(client, options?)`.
- [x] **`drag-store.ts` (опционально):** `dropForCopy` для UI/отладки; иначе только параметр в `refreshTarget`.
- [x] **`use-canvas-dnd.ts`:** `e.altKey` на move/up; ветка `copyNodeToTarget` vs `moveNode`; подключить autopan rAF; JSDoc/шапка.
- [x] **Тесты:** расширить `dnd-release` не обязательно; при возможности — unit на ветку up с Alt (мок стора) или короткий сценарий в `canvas-dnd.dom.test.ts`.
- [x] **`docs/USER_GUIDE.md`:** ✅ Alt-копия, ✅ автопан (где срабатывает, полоса у края **поля** без панелей); снять ⏳ в шапке «Перетащить»; таблица хоткеев — ✅ у Alt при отпускании; уточнение flex/grid при Alt.
- [x] **`docs/PLAN.md`:** `[x]` 7.8 + заметка (файлы, решения по открытым вопросам ниже).
- [x] `npm run format` → `npm run check`; браузер (демо, Edge, обе темы): Alt-копия на поле/в блок/корень за заголовок; автопан у левого/правого/верх/низ края видимого поля.
- [ ] Коммит: `7.8: Alt-копия при drop и автопан у края поля`. (по запросу пользователя — не делать)

---

## Открытые вопросы (worker: зафиксировать в заметке PLAN)

### 1. Alt-копия в панели «Слои»?

| Вариант | Суть |
|---------|------|
| **A (рекомендация)** | **Только канвас** в 7.8: `use-canvas-layers-dnd.ts` не трогать; в USER_GUIDE Alt-копия не обещать для слоёв. |
| **B** | Тот же `altKey` на `pointerup` в слоях: `copyNodeToTarget` вместо `moveNode` при допустимом `layersMoveTarget`. |
| **C** | Отложить; если пользователь выберет B — отдельная мини-итерация. |

### 2. Учитывать ли `Alt` только на отпускании для превью flex/grid?

| Вариант | Суть |
|---------|------|
| **A (рекомендация)** | Превью (`forCopy`) следует **`e.altKey` на `pointermove`**; отпускание — по `pointerup`. |
| **B** | Только `pointerup`: превью до отпускания всегда как перенос (проще, но линия может «прыгнуть» в момент Alt). |

### 3. Граница автопана: `visibleArea` vs весь viewport?

| Вариант | Суть |
|---------|------|
| **A (рекомендация)** | **`visibleArea`** + `CANVAS_SAFE_INSETS` — панорамирование у края **рисуемого поля**, не под панелями. |
| **B** | Край окна viewport целиком — проще, но курсор над «Слоями» мог бы крутить поле. |

### 4. No-op Alt-копия на том же месте

| Вариант | Суть |
|---------|------|
| **A (рекомендация)** | Как перенос — **без изменений** документа. |
| **B** | Всегда вставлять копию (как `Ctrl+D` у соседа) даже без сдвига мыши. |

---

## Риски и митигации

| Риск | Митигация |
|------|-----------|
| Неверный flex/grid индекс при Alt | `skip = null` при `forCopy`; тест на сценарий «копия в того же родителя между соседями». |
| Двойной `commit` (копия + случайный move) | Одна ветка в `onPointerUp` после `releaseMove`; `stop()` после решения. |
| Утечка rAF / слушателей | Отмена в `stop()`, `onBeforeUnmount`, `visibilitychange` (как у DnD). |
| Автопан + `origin` viewport устарел | После `panBy` не менять `origin` mid-drag (уже так для колеса); `refreshAtLast` по камере. |
| Конфликт `Alt` с хоткеями | Во время DnD хоткеи заблокированы; `Alt+↑/↓` не приходят. На `pointerup` Alt не блокировать камеру. |
| Копия корня-источника связи в блок | `canMoveNode` → `source-into-block` — отказ, как при переносе. |
| Производительность rAF | Пан только при ненулевой delta; не трогать дерево на кадр. |
| Windows / Alt+Tab | `blur` уже вызывает `stop()` — автопан и drag сбрасываются. |

---

## Файлы (ожидаемые изменения)

| Файл | Действие |
|------|----------|
| `dnd/drag-autopan.ts` | **новый** |
| `dnd/__tests__/drag-autopan.test.ts` | **новый** |
| `tree-copy.ts` + `__tests__/tree-copy.test.ts` | **новый** (или рядом с `tree-move`) |
| `constants.ts` | autopan margin/speed |
| `dnd/use-drop-target.ts` | `forCopy`, `skip` |
| `dnd/use-canvas-dnd.ts` | Alt, autopan rAF |
| `layout-store.ts` | `copyNodeToTarget` |
| `layout-store.test.ts` | кейсы копии |
| `docs/USER_GUIDE.md`, `docs/PLAN.md` | готовность 7.8 |
| `docs/TOKENS.md` | при новых токенах autopan |

**Не трогать без выбора B:** `use-canvas-layers-dnd.ts`, `layers-drop.ts`.

---

## После 7.8 (родитель, не worker)

1. Ревью diff этапа 7: `git diff 0904142..HEAD` (коммит `0904142` — последний до 7.1).
2. Чеклист ревью — `agent-workflow.md` (фокус/blur, Esc, undo во время drag, слушатели, §11 frontend.md, производительность pointermove).
3. При замечаниях — коммит `Этап 7: правки по ревью`, заметка под 7.8 в `PLAN.md`.

---

## Критерии готовности

- Alt при отпускании на канвасе создаёт копию в валидной цели; исходник на месте; один шаг истории; выделена копия.
- У края видимого поля во время drag поле само сдвигается; drop и линия вставки остаются корректными после пана.
- `npm run check` зелёный; USER_GUIDE и PLAN обновлены.

---

Путь к плану для worker: `.claude/plans/2026-10-16-23-00-iteration-7-8-dnd-modifiers.md`
