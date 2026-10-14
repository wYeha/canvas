# Итерация 1.3 — Операции над деревом

## Цель и контекст

Нужен набор чистых функций над `LayoutDocument` (`shared/src/document/*`): поиск, добавление, удаление, дублирование, перемещение и правка узлов. Входной документ они не мутируют (правила фронтенда, 6.4–6.5). На этих функциях будут построены:
- 1.4: стор, экшены поверх `tree.ts`;
- 1.10: плашка пути (`getPath`), Esc/Enter (`findParent`);
- 5.1/5.2: удалить, дублировать, вверх/вниз, копировать/вставить (`cloneSubtree` + `addChild`/`addRoot`);
- 5.3: undo на снимках. Нужно структурное разделение, а «ничего не изменилось» = **тот же объект**;
- 7.x: DnD. Проверка заранее (`canMoveNode`), `moveNode` в блок, между корнями и на канвас, Alt-копия (`cloneSubtree`);
- 8.x: связи. `removeNode` чистит осиротевшие link-узлы. `canMoveNode` — точка расширения для проверки циклов в 8.1.

Модель: `doc.roots: RootEntry[]` (`{ canvas, node: BlockNode }`), узлы `BlockNode` (`children`) | `LinkNode` (`sourceId`, `self`, без детей). `parseDocument` проверяет уникальность id и то, что `sourceId` указывает на корневой блок.

## Архитектурные решения

1. **Файлы** (всё в `frontend/src/scripts/pages/canvas/`, ни один не должен быть больше ~300 строк):
   - `tree-types.ts`: `NodeLocation`, `MoveTarget`, `TreeError`, `NodePatch`, `DuplicateResult`;
   - `tree-query.ts`: `findNode`, `findRootEntry`, `findParent`, `getPath`, `isDescendant`, `locateNode` (без изменений документа);
   - `tree-internal.ts`: внутренние хелперы структурного разделения (не реэкспортируются): `updateAtLocation`, `removeAtLocation`, `insertAt`, `collectIds`, `removeLinksTo`, `isLinkSource`;
   - `tree-move.ts`: `canMoveNode`, `moveNode`;
   - `tree.ts`: фасад. Здесь `addChild`, `canAddChild`, `addRoot`, `removeNode`, `updateNode`, `updateRootPlacement`, `cloneSubtree`, `duplicateNode` плюс `export * from './tree-query'`, `'./tree-move'`, `'./tree-types'`. Снаружи импортируют только `@/scripts/pages/canvas/tree`.
   - Циклических импортов нет: `tree-move` → `tree-internal`/`tree-query`, `tree` → все остальные.
2. **Иммутабельность.** Копируется только путь от `doc` через `roots[i]` до изменённого узла (`{ ...node, children: [...] }`). Остальные корни, соседи и поддеревья остаются **теми же ссылками**, и тесты это проверяют. Изменённые узлы собираются через spread, мутация собранных объектов тоже не допускается.
3. **Недопустимая или пустая операция возвращает тот же объект `doc`** (`result === doc`), а не результат-ошибку. Причины отказа выдают отдельные предикаты `canMoveNode` / `canAddChild` → `TreeError | null`, и мутирующие функции сами вызывают их внутри.
   Обоснование: DnD (7.3, 7.7) проверяет заранее, чтобы приглушить цель и показать знак запрета, и ему нужна причина. Стор (5.3) по `next === doc` не пишет снимок в историю. Обёртка-результат заставила бы разворачивать каждый вызов.
   Исключение одно: `duplicateNode` возвращает `DuplicateResult { document; copyId: NodeId | null }`, потому что стору нужен id копии для выделения. `copyId === null` ⇔ `document === doc`.
4. **`updatedAt` не трогаем.** Его ставит стор (1.4) при каждом изменении, если `next !== doc`. Так функции остаются детерминированными (без часов) и тестируются через `toEqual`. `labelCounter` и `createdAt` дерево тоже не трогает.
5. **Индекс в `moveNode`** — позиция вставки в **текущем** списке детей (до изъятия узла), `0..children.length`, как её считает DnD по отрисованному списку. Если родитель тот же и `from < index`, то `index -= 1`. Если итоговая позиция совпадает с исходной, это no-op и возвращается `doc`. Индекс вне диапазона зажимается в `[0, len]`. Для «вверх/вниз» (5.1): вверх `index = from - 1`, вниз `index = from + 2`. Записать это в JSDoc `moveNode`.
6. **Цель перемещения** — дискриминированный союз:
   ```ts
   type MoveTarget =
     | { type: 'child'; parentId: NodeId; index: number }
     | { type: 'canvas'; at: CanvasPoint; width?: number; rootIndex?: number }
   ```
   - Вложенный блок → `canvas`: создаётся `RootEntry { canvas: { x, y, width, height: null, exportMaxWidth: false }, node }`. `width` = переданное значение, а без него **ширина превью корня, из которого узел вынут**. DnD (7.3) должен передавать измеренную ширину места (px / zoom), она точнее. Если ничего не передано, ширина корня-источника сохраняет тот же контекст `fr`/`%`. 1440 был бы произвольным выбором, а для узких корней (карточка 480) просто неверным. `rootIndex` по умолчанию — в конец.
   - Корень → `canvas`: обновляются `x`, `y` (и `width`, если передан). `height`/`exportMaxWidth` сохраняются, корень переставляется на `rootIndex`, если тот задан (для перестановки корней в слоях, 7.7). Иначе позиция в `roots` остаётся прежней.
   - Корень → `child`: `RootEntry` убирается, `canvas` отбрасывается, `node` вставляется ребёнком.
   - `self` узла при любом переносе **сохраняется как есть**: `nodeToStyle` (1.8) учитывает тип родителя, а перенос обратно не теряет настроек.
7. **Запреты** (`TreeError`):
   - `'node-not-found'`, `'target-not-found'`;
   - `'parent-is-link'`: дети у link-узла запрещены;
   - `'into-self-or-descendant'`: `parentId === nodeId || isDescendant(doc, nodeId, parentId)`;
   - `'link-to-canvas'`: link не может стать корнем, корень — только блок;
   - `'source-into-block'`: корень, на который ссылается хотя бы одна связь, нельзя вложить в блок.
     Обоснование: по DESIGN.md «источник — только корневой блок». Тихо удалить связи значило бы потерять их в других местах документа, которые пользователь не видит. Запрет DnD покажет заранее. Обратная команда «Вынести на канвас» (8.5) идёт через `moveNode` → `canvas` + `addChild(link)`, этот запрет её не задевает;
   - `'duplicate-id'`: в добавляемом поддереве есть id, который уже есть в документе (для `addChild`/`addRoot`);
   - `'dangling-link'`: в добавляемом поддереве есть link, чей `sourceId` не корень документа.
   Циклы связей здесь **не** проверяются. Это 8.1, и он расширит `canMoveNode`/`canAddChild`. В JSDoc оставить пометку.
8. **Связи при удалении.** `removeNode` корня убирает `RootEntry` и **все link-узлы с `sourceId === rootId` во всём документе**. Перестраиваются только корни, где такие link-узлы были, остальные остаются той же ссылкой. Удаление вложенного блока или link-узла чистки не требует: вложенный блок не может быть источником.
9. **`duplicateNode`**: копия всего поддерева через `cloneSubtree` (новые id всем узлам через `createId`, link-узлы сохраняют `sourceId`). Копия вставляется сразу после оригинала (`index + 1` у родителя). Для корня создаётся новый `RootEntry` в `roots` сразу после оригинала, `canvas` копируется, `x += width + DUPLICATE_ROOT_GAP` (80), `y` тот же. Справа копию видно сразу, а сдвиг на 40px у широких корней перекрылся бы почти целиком. Копия корня-источника источником **не** становится: связи остаются на оригинале.
   **Подписи копируются как есть, без суффикса, на всех уровнях.** Копия — «такой же элемент» (ряд карточек, ×N). Суффикс вроде «(копия)» попал бы в экспорт для ИИ как шум. Со слиянием проблем нет: копия блока-цели с единственной плашкой-слиянием тоже сливается, и это корректно. Новых связей дублирование не создаёт, так что случайное слияние возможно только после того, как пользователь сам протянет стрелку. Это ослабляет фразу DESIGN.md «автоподписи никогда не совпадают». Оставить заметку под 1.3 в PLAN.md и одну строку в DESIGN.md → «Подписи блоков» («при дублировании подписи копируются как есть»).
10. **`updateNode(doc, nodeId, patch: NodePatch)`**: `NodePatch = Partial<Omit<BlockNode, 'id' | 'type' | 'children'>>`. Слияние поверхностное: вложенные объекты (`container`, `self`, `padding`) заменяются целиком, так поле можно удалить из `self`. Для link-узла допустим только ключ `self`, любой другой ключ → `doc`. Если все значения патча `Object.is`-равны текущим → `doc`. `sourceId` здесь не меняется: перепривязка — это 8.5. Для `canvas` корня отдельная функция `updateRootPlacement(doc, rootId, patch: Partial<CanvasPlacement>)`, она понадобится в 3.1 и 7.2. Валидность значений (`width > 0`) — забота UI, но `width <= 0` → `doc`.

## Сигнатуры (итог)

```ts
// tree-query.ts
findNode(doc, nodeId): LayoutNode | undefined
findRootEntry(doc, nodeId): RootEntry | undefined          // только если nodeId — корень
findParent(doc, nodeId): BlockNode | undefined             // undefined для корня и для отсутствующего
getPath(doc, nodeId): LayoutNode[]                         // [корень, ..., узел]; [] если нет
isDescendant(doc, ancestorId, nodeId): boolean             // строго внутри поддерева ancestor
locateNode(doc, nodeId): NodeLocation | undefined          // { rootIndex, indices: number[] }; [] = сам корень

// tree.ts
canAddChild(doc, parentId, node): TreeError | null
addChild(doc, parentId, node, index?): LayoutDocument       // по умолчанию в конец; index зажимается
addRoot(doc, entry, index?): LayoutDocument                 // проверки duplicate-id / dangling-link
removeNode(doc, nodeId): LayoutDocument
updateNode(doc, nodeId, patch): LayoutDocument
updateRootPlacement(doc, rootId, patch): LayoutDocument
cloneSubtree(node): LayoutNode                              // новые id всему поддереву (для 5.2, 7.8)
duplicateNode(doc, nodeId): DuplicateResult

// tree-move.ts
canMoveNode(doc, nodeId, target): TreeError | null
moveNode(doc, nodeId, target): LayoutDocument
```
Тип `CanvasPoint` уже есть в `factories.ts`, импортировать оттуда. Перегрузку `cloneSubtree` для `BlockNode` → `BlockNode` сделать через generic `<T extends LayoutNode>(node: T): T`.

## Декомпозиция

- [x] Шаг 1: `constants.ts`: добавить `DUPLICATE_ROOT_GAP = 80` с JSDoc.
- [x] Шаг 2: `tree-types.ts`: `NodeLocation`, `MoveTarget`, `TreeError` (union строк из п. 7), `NodePatch`, `DuplicateResult`. Шапка, JSDoc у каждого типа.
- [x] Шаг 3: `tree-query.ts`: обход в глубину по всем `roots`. `locateNode` — основа, остальные функции через неё. `isDescendant` ищет `nodeId` внутри поддерева `ancestor` (сам узел не считается потомком).
- [x] Шаг 4: `tree-internal.ts`:
  - `updateAtLocation(doc, loc, fn)` копирует путь и заменяет узел результатом `fn`;
  - `removeAtLocation` (для корня — `roots` без entry);
  - `insertAt(arr, index, item)`;
  - `collectIds(node)`;
  - `isLinkSource(doc, rootId)`;
  - `removeLinksTo(doc, sourceId)` возвращает `doc`, если удалять нечего, и пересобирает только затронутые корни/ветки.
  Каждая функция ≤ ~40 строк, рекурсию по детям вынести в отдельный хелпер.
- [x] Шаг 5: `tree.ts`: `canAddChild`/`addChild`/`addRoot` (проверки п. 7), `removeNode` (п. 8), `updateNode`/`updateRootPlacement` (п. 10), `cloneSubtree`/`duplicateNode` (п. 9). Реэкспорты.
- [x] Шаг 6: `tree-move.ts`: `canMoveNode` по порядку: node-not-found → для `child`: target-not-found / parent-is-link / into-self-or-descendant / source-into-block; для `canvas`: link-to-canvas. Затем `moveNode`, разбитый на `detach` (вынуть узел, запомнить исходную ширину корня и позицию) и `attach` (child/canvas), плюс корректировка индекса и no-op (п. 5–6).
- [x] Шаг 7: тесты (см. ниже) в `frontend/src/scripts/pages/canvas/__tests__/`: `tree-query.test.ts`, `tree.test.ts`, `tree-move.test.ts`. Общий фикстур-билдер `__tests__/tree-fixture.ts` нельзя: тесты только в `__tests__`, а вспомогательный файл без `.test` там допустим, если Vitest `include` его не цепляет как тест. Проверить `include` в `frontend/vite.config`/`vitest.config`. Если мешает, сделать фикстуру функцией внутри каждого файла.
- [x] Шаг 8: `npm run check` зелёный.
- [x] Шаг 9: `docs/PLAN.md`: `[x]` у 1.3 и заметка:
  - разбивка на файлы;
  - «недопустимо → тот же doc + can*-предикаты»;
  - `updatedAt` ставит стор;
  - запрет вложения корня-источника;
  - подписи копий без суффикса;
  - ширина при выносе на канвас;
  - `updateRootPlacement`/`cloneSubtree` сверх формулировки.
  
  Одна строка в DESIGN.md → «Подписи блоков» про копии. USER_GUIDE не меняется: новых действий пользователя нет (отметить в заметке).

## Тесты (ключевые кейсы)

Фикстура: корень A (flex, 1440) с детьми [a1 (grid, дети [a1x, a1y]), a2, linkB (→ B)], корень B (grid, 480) с [b1], корень C (flex, без входящих связей) с [c1]. Хелперы:
- `deepFreeze(doc)` перед каждой операцией: ESM-тесты в strict mode, любая мутация бросит ошибку;
- `expectValid(doc)` = `expect(parseDocument(doc).ok).toBe(true)`.

**Инвариант**: в каждом тесте мутирующей функции результат проходит `expectValid`, вход заморожен.

- Запросы: `findNode` находит корень, вложенный узел и link, для чужого id → `undefined`. `findParent` у корня → `undefined`. `getPath` даёт `[A, a1, a1x]`. `isDescendant(A, a1x)` = true, `(a1, a1)` = false, `(a1x, a1)` = false.
- Структурное разделение: после `updateNode(a1x)` `result.roots[1] === doc.roots[1]`, `a2 === a2`, а `A` и `a1` — новые объекты.
- `addChild`: в конец, по индексу, индекс за пределами зажимается. В link → `doc` и `canAddChild` = `'parent-is-link'`. Узел с существующим id → `'duplicate-id'`. Link на некорень → `'dangling-link'`. Link на корень → ок.
- `addRoot`: в конец и по индексу, дубль id → `doc`.
- `removeNode`: вложенный блок с поддеревом; link-узел. Корень B → нет B и нет `linkB` в A, `roots` C той же ссылкой. Несуществующий id → `doc`.
- `updateNode`: замена `self` целиком (удаление ключа). У link `self` → ок, `label` → `doc`. Патч с равными значениями → `doc`. `updateRootPlacement`: x/y, `width: 0` → `doc`, у некорня → `doc`.
- `cloneSubtree`/`duplicateNode`:
  - все id новые и уникальны, структура и подписи равны оригиналу;
  - копия стоит на `index + 1`, `copyId` = id копии;
  - дубль link — новый id, тот же `sourceId`;
  - дубль корня B → новый entry сразу после B, `x = B.x + 480 + 80`, связи по-прежнему ссылаются на B;
  - несуществующий → `{ document: doc, copyId: null }`.
- `moveNode`:
  - внутри одного родителя вперёд и назад (индексы до изъятия: [x, y] → index 2 даёт [y, x]); на своё же место (`index = from` и `from + 1`) → `doc`;
  - в другой блок того же корня; в блок другого корня (C.c1 → A.a1);
  - link-узел в другой блок → ок; link на канвас → `doc` / `'link-to-canvas'`;
  - в себя и в потомка → `'into-self-or-descendant'`; в link → `'parent-is-link'`;
  - корень C в блок `a1` → C пропал из `roots`, стал ребёнком, `canvas` нет;
  - корень B (источник `linkB`) в блок → `'source-into-block'`, `doc`;
  - вложенный `a1` на канвас без `width` → новый корень с `width = 1440` (ширина A) и заданными x/y; с `width: 600` → 600; `rootIndex` уважается;
  - корень на канвас → меняются x/y, `height`/`exportMaxWidth` сохранены, `rootIndex` переставляет;
  - несуществующие узел/цель → `doc`.
- (Опционально) свёртка ~200 случайных операций с фиксированным seed над фикстурой: после каждой `expectValid`. Это ловит пропущенные инварианты.

## Риски и митигации

| Риск | Митигация |
|---|---|
| Случайная мутация входа (push/splice в копиях, которые на самом деле общие) | `deepFreeze` во всех тестах; в коде только spread/`toSpliced`/`with` (ES2023: проверить `lib` в tsconfig, иначе slice+spread) |
| Ошибка сдвига индекса при переносе в того же родителя | Явное правило в JSDoc + тесты на обе стороны и no-op |
| Осиротевшие связи → документ не открывается (`parseDocument` упадёт при загрузке) | Чистка в `removeNode`, запрет `source-into-block`, проверки в `addChild`/`addRoot`, инвариант в каждом тесте |
| Функции длиннее 40 строк / файл > 300 строк | Разбивка из п. 1, detach/attach в `moveNode` |
| Циклы связей (link внутри собственного источника) пока не ловятся | Вне рамок 1.3 (`parseDocument` их тоже не проверяет). Точка расширения — `canMoveNode`/`canAddChild` в 8.1, пометка в JSDoc |
| `createId` в `cloneSubtree` делает функцию недетерминированной | Тесты проверяют уникальность и неравенство с оригиналом, а не конкретные значения |

## Затронутые файлы

- `frontend/src/scripts/pages/canvas/constants.ts` (правка)
- `frontend/src/scripts/pages/canvas/tree-types.ts` (новый)
- `frontend/src/scripts/pages/canvas/tree-query.ts` (новый)
- `frontend/src/scripts/pages/canvas/tree-internal.ts` (новый)
- `frontend/src/scripts/pages/canvas/tree-move.ts` (новый)
- `frontend/src/scripts/pages/canvas/tree.ts` (новый, фасад)
- `frontend/src/scripts/pages/canvas/__tests__/tree-query.test.ts`, `tree.test.ts`, `tree-move.test.ts` (новые)
- `docs/PLAN.md`, `docs/DESIGN.md` (заметки)
