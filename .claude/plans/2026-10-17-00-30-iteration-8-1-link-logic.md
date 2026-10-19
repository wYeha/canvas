# Итерация 8.1 — логика связей

## Цель и контекст

Реализовать **чистую** логику связей по [DESIGN.md](../../docs/DESIGN.md) (раздел «Связи»): режим **слияние / вложение** по подписям, запрет **циклов**, запросы «**кто куда подключён**». Без UI (порты, SVG, плашки, Del, ширина, экспорт — 8.2–8.7).

Опора на существующий код:

- Модель: `LinkNode` в `shared/src/document/node.ts` — только `sourceId` + `self`; в схеме явно: **режим не хранится**, вычисляется.
- `tree-internal.ts`: `hasLinkTo`, `isLinkSource`, `removeLinksTo`.
- `tree.ts` / `tree-move.ts`: `canAddChild`, `canMoveNode` — циклы **отложены** (комментарии «8.1»); `source-into-block` уже есть.
- `parseDocument` / `layoutDocumentSchema`: уникальность id, `sourceId` → корень; **циклы не проверяются** (PLAN 1.1).
- `export-link.ts`: подпись источника; режим слияния в экспорт — 8.7.
- Демо и фикстуры: связи KPI → `createDemoDocument`, `tree-fixture` (`linkB`).

**USER_GUIDE:** разделы «Создать связь» / «Работа со связями» пока без ✅ — в 8.1 **не менять** (нет нового действия для пользователя). В PLAN.md под 8.1 указать, что руководство обновится с 8.2+.

## Архитектурные решения

### 1. Где жить модулю

| Слой | Путь | Содержимое |
|------|------|------------|
| **Shared** (источник правды для режима и циклов) | `shared/src/document/link-logic.ts` | Нормализация подписей, `linkMode`, обход связей, проверка циклов, типы размещения |
| **Тесты shared** | `shared/src/document/__tests__/link-logic.test.ts` | Unit без фронта |
| **Фронт** | `tree.ts`, `tree-move.ts`, `tree-internal.ts` | Тонкая интеграция: новый `TreeError`, вызовы shared |
| **Схема документа** | `shared/src/document/document.ts` | `superRefine`: цикл связей → ошибка разбора |
| **Реэкспорт** | `shared/src/index.ts` | `export * from './document/link-logic'` |

**Не** дублировать файл `frontend/.../link-logic.ts`: импорт `@shared`. Обход «родитель / потомок блока» для циклов реализовать **внутри shared** (локальные функции обхода `LayoutDocument`), без импорта `frontend/.../tree-query.ts` — иначе `parseDocument` потянет фронт.

**`mode` в данных:** не добавлять. Соответствует `node.ts` и DESIGN («пересчитывается сам»).

### 2. Типы и публичный API (`link-logic.ts`)

```ts
/** Режим связи на канвасе и в экспорте (8.7). */
export type LinkMode = 'merge' | 'embed'

/** Одно размещение: плашка в дереве и блок-цель (родитель плашки). */
export interface LinkPlacement {
  linkId: NodeId
  sourceId: NodeId
  targetBlockId: NodeId
}

/** Нормализованная подпись для сравнения; `null` — пустая после trim (не участвует в слиянии). */
export function normalizeLinkLabel(label: string): string | null

/** Совпадение подписей: trim, без учёта регистра; пустые не совпадают. */
export function labelsMatch(sourceLabel: string, targetLabel: string): boolean

/** Родительский блок плашки; `undefined`, если узел не найден или родитель не блок. */
export function linkTargetBlock(doc: LayoutDocument, linkId: NodeId): BlockNode | undefined

/** Режим связи по документу и id плашки (или по `LinkNode` + doc). */
export function linkMode(doc: LayoutDocument, link: LinkNode): LinkMode

/** Все плашки документа с целевыми блоками. */
export function collectLinkPlacements(doc: LayoutDocument): LinkPlacement[]

export function linksFromSource(doc: LayoutDocument, sourceId: NodeId): LinkPlacement[]

export function linksIntoBlock(doc: LayoutDocument, targetBlockId: NodeId): LinkPlacement[]

/** Есть ли хотя бы одна связь на корень-источник (замена смысла `isLinkSource`). */
export function isLinkSource(doc: LayoutDocument, rootId: NodeId): boolean

/**
 * Цикл: цель — блок `targetBlockId`, куда встанет/стоит плашка на `sourceId`.
 * Запрещено: target === source или target лежит в поддереве корня-source.
 */
export function wouldCreateLinkCycle(doc: LayoutDocument, sourceId: NodeId, targetBlockId: NodeId): boolean

/** true, если в документе есть хотя бы одна плашка с циклом. */
export function documentHasLinkCycles(doc: LayoutDocument): boolean
```

Допустимо объединить перегрузки (`linkMode` по `linkId` vs `LinkNode`) — на усмотрение worker, без раздувания API.

**Слияние** (`merge`), согласовано с DESIGN + USER_GUIDE:

1. `labelsMatch(подпись корня-source, подпись блока-цели)`.
2. У блока-цели **нет дочерних блоков** (`type === 'block'`). Другие плашки-связи **не** мешают слиянию (в гайде: «нет других **блоков**»).

Иначе — **`embed`**. Иконки `→` / `⇄` в UI — константы фронта в 8.4; в 8.1 достаточно `LinkMode`.

**Цикл** (DESIGN: «источник уже содержит цель»):

- `targetBlockId === sourceId` → цикл.
- `isBlockDescendant(doc, sourceId, targetBlockId)` → цикл (строгое вложение блока-цели в поддерево корня-источника; сам корень не считается потомком себя — как `isDescendant` во фронте).

Проверять **каждую** плашку: `wouldCreateLinkCycle(doc, link.sourceId, targetBlockId)`.

### 3. Интеграция в дерево (`TreeError`)

Добавить в `tree-types.ts`:

```ts
| 'link-cycle' // плашка внутри собственного источника (или его потомка)
```

- **`canAddChild`**: если добавляемый узел — плашка `link`, после базовых проверок: `wouldCreateLinkCycle(doc, node.sourceId, parentId)` → `'link-cycle'`. Если добавляется **поддерево** с плашками — для каждой плашки внутри узнать `targetBlockId` (родитель в составе добавляемого дерева + уже существующий `parentId` для корня вставки) и проверить цикл относительно **текущего** `doc` (корни-источники уже в документе).
- **`addRoot`**: в `checkSubtree` / отдельной проверке — для плашек внутри нового корня `targetBlockId` из обхода; `sourceId` нового корня считать валидным источником при проверке «dangling» (см. открытый вопрос ниже).
- **`canMoveNode`** (`type: 'child'`): после `checkChildTarget`, если переносим **блок** — для каждой плашки в поддереве переносимого узла вычислить `targetBlockId` **после** переноса (структура внутри поддерева сохраняется; меняется только цепочка предков до корня документа). Если какая-то связь станет цикличной → `'link-cycle'`. Плашку на канвас по-прежнему `'link-to-canvas'`.

`addChild` / `moveNode` / `addRoot` без изменения контракта: при ошибке — тот же `doc`.

**`tree-internal.isLinkSource`:** реализовать через `isLinkSource` из `@shared` (или `linksFromSource(...).length`) — один источник правды; `hasLinkTo` удалить или оставить приватным делегатом.

### 4. `parseDocument` / схема

В `layoutDocumentSchema.superRefine` после существующих проверок:

- Для каждого размещения из `collectLinkPlacements`: если `wouldCreateLinkCycle` → issue с путём к `sourceId` плашки, сообщение по-русски в духе: «Связь указывает внутрь собственного источника» (без английского `Invalid`).

Обновить комментарий в `document.ts`: циклы проверяются здесь.

Тесты в `parse-document.test.ts`: валидный демо-подобный документ; документ с плашкой внутри источника → `ok: false`.

### 5. Связь с будущими итерациями

| Итерация | Использование 8.1 |
|----------|-------------------|
| 8.2 | `wouldCreateLinkCycle(doc, sourceRootId, targetBlockId)` для подсветки целей |
| 8.4 | `linkMode` → подпись плашки `→` / `⇄` (`node-view`, константа merge-иконки) |
| 8.5 | перепривязка `sourceId` — снова `wouldCreateLinkCycle` |
| 8.7 | `linkMode` для слияния при экспорте |
| 7.3 DnD | без изменений в 8.1; `source-into-block` остаётся отдельным правилом |

Опционально в 8.1: **`canConnectLink(doc, sourceId, targetBlockId)`** = корень существует + не цикл (обёртка для 8.2) — если укладывается в ~5 строк, добавить в shared.

### 6. Рефакторинг подписей (минимальный)

- `labelsMatch` / `normalizeLinkLabel` — единые правила с `blockLabel` (`trim`) и `sourceLabel` в `export-link.ts` (пустая → «Без подписи» только для **отображения**, не для слияния).
- В 8.1 **не обязательно** менять `export-link` / `node-view`, если тесты режима покрыты в shared. Желательно один тест, что `labelsMatch(' KPI ', 'kpi')` и пустые подписи → embed.

## Чеклист для worker

- [x] `shared/src/document/link-logic.ts` + тесты `link-logic.test.ts` (режим, циклы, collect, `isLinkSource`).
- [x] `shared/src/index.ts` — реэкспорт.
- [x] `document.ts` — проверка циклов в `superRefine`; комментарий обновить.
- [x] `parse-document.test.ts` — кейсы цикла.
- [x] `tree-types.ts` — `'link-cycle'`.
- [x] `tree.ts` — `canAddChild` / `checkSubtree` (плашки в поддереве).
- [x] `tree-move.ts` — `canMoveNode` для переноса блока с плашками внутри.
- [x] `tree-internal.ts` — `isLinkSource` через shared.
- [x] `tree.test.ts`, `tree-move.test.ts` — цикл при `addChild` / `addRoot` / `moveNode`; существующий кейс «связь внутри нового корня на сам корень» должен стать `'link-cycle'` или остаться no-op через dangling — **зафиксировать в тесте** (см. открытые вопросы).
- [x] `npm run format`, `npm run check`.
- [x] `docs/PLAN.md` — `[x]` 8.1 + заметка `>` (файлы, API, отклонения). USER_GUIDE без изменений.
- [ ] Саморевью по чеклисту agent-workflow; коммит `8.1: логика связей` (push не делать). — коммит делает родитель после ревью.

## Риски и митигации

| Риск | Митигация |
|------|-----------|
| Дублирование обхода дерева (shared vs `tree-query`) | Один модуль `link-logic.ts` в shared; фронт только вызывает API. При росте — вынести `shared/src/document/tree-path.ts` **только если** >~80 строк дубля. |
| `canMoveNode` + циклы: неверная симуляция после переноса | Тест: корень `S`, внутри блок `T`, связь `S→T`; перенос `T` глубже не ломает; перенос контейнера, который делает `T` потомком `S` при уже существующей связи — запрет. |
| `addRoot` со связью на `entry.node.id` | Сейчас отсекается как `dangling-link`. Явно добавить проверку цикла, когда корень уже в `rootIds` (после объединения логики). |
| Слияние: только плашки в цели | Тест: цель с одной плашкой и без блоков-детей + совпадение подписей → merge; одна плашка + один блок → embed. |
| Производительность | `collectLinkPlacements` O(n) по узлам; вызывать в `superRefine` один раз; не вешать на каждый кадр (8.1 без UI). |

## Открытые вопросы (решить в реализации или у пользователя)

1. **`addRoot` + связь на id нового корня внутри его же детей:** после появления `link-cycle` — возвращать `'link-cycle'` вместо `'dangling-link'`? Рекомендация: при `addRoot` считать id нового корня валидным `sourceId` в `checkSubtree` и отдавать **`link-cycle`** для self-link — поведение понятнее, тест в `tree.test.ts` обновить.
2. **Перенос блока:** достаточно проверять только плашки в поддереве переносимого узла (рекомендация: да); глобальный пересчёт всего документа не нужен.
3. **`canConnectLink`:** делать в 8.1 или отложить до 8.2 — на усмотрение worker (не блокер).

## Путь к плану

`.claude/plans/2026-10-17-00-30-iteration-8-1-link-logic.md`

Передай этот файл агенту **worker** для реализации.

## Решения родителя (2026-10-19) — обязательны, заменяют варианты выше

1. **Слияние — только если плашка единственный ребёнок цели** (решение пользователя): `labelsMatch(источник, цель)` и `target.children.length === 1` (это сама плашка). Любой другой ребёнок — блок или другая плашка — даёт `embed`. Это совпадает с DESIGN.md («у цели нет других детей»). Пункт «Другие плашки-связи **не** мешают слиянию» выше — **отменён**. В USER_GUIDE.md (раздел «Слияние и вложение», строка «…и у цели нет других блоков внутри…») заменить на «…и у цели нет других детей (ни блоков, ни других связей)…» — единственная правка руководства в 8.1, раздел не помечать ✅.
2. Открытый вопрос 1: при `addRoot` id нового корня — валидный `sourceId`; связь на него внутри его же поддерева → `'link-cycle'`. Тест в `tree.test.ts` обновить.
3. Открытый вопрос 2: при переносе проверять только плашки в поддереве переносимого узла.
4. Открытый вопрос 3: `canConnectLink(doc, sourceId, targetBlockId)` добавить в shared (источник — существующий корень, цель — существующий блок, без цикла).
