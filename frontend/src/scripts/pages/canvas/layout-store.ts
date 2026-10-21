/**
 * Pinia-хранилище страницы canvas: текущий документ, выделение, ховер и история undo/redo. Экшены — тонкие
 * обёртки над чистыми операциями `tree.ts`; DOM и localStorage здесь не трогаем (сохранение — `documents-store.ts`).
 */
import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { parseDocument, type ParseDocumentResult } from '@shared'
import type {
  CanvasPlacement,
  ContainerKind,
  LayoutDocument,
  LayoutFragment,
  LayoutNode,
  NodeId,
  RootEntry,
} from '@shared'
import { withFragmentSources } from './clipboard-fragment'
import { HISTORY_LIMIT, HISTORY_MERGE_MS, IMPORTED_SOURCE_GAP, RULES_MERGE_KEY } from './constants'
import { changedFields, emptyHistory, recordStep, redoStep, undoStep, type HistoryMove } from './history'
import {
  createBlock,
  createDocument,
  createLinkBlock,
  createRootEntry,
  nextAutoLabel,
  type CanvasPoint,
} from './factories'
import { rootLabelMap } from './node-view'
import * as tree from './tree'
import * as extract from './tree-extract'
import { withoutDanglingLinks } from './tree-internal'
import type { ExtractTarget } from './tree-extract'
import type { MoveTarget, NodePatch } from './tree'

/** Снимок для истории: документ (иммутабелен, хранится по ссылке) и выделение в момент записи шага. */
interface HistorySnapshot {
  document: LayoutDocument
  selectedId: NodeId | null
}

/** Ключ и окно склейки записи в историю; без них запись — отдельный шаг. */
interface MergeOptions {
  key: string
  window: number
}

/** Склейка без ограничения по времени: подпись нового блока входит в шаг его создания, сколько бы её ни вводили. */
const UNLIMITED_MERGE_WINDOW = Number.POSITIVE_INFINITY

/** Склейка шага создания блока с записью его подписи. */
function createMerge(id: NodeId): MergeOptions {
  return { key: `create:${id}`, window: UNLIMITED_MERGE_WINDOW }
}

export const useLayoutStore = defineStore('layout', () => {
  /** Текущий документ. */
  const document = ref<LayoutDocument>(createDocument())
  /** Id выделенного узла. */
  const selectedId = ref<NodeId | null>(null)
  /** Id узла под курсором. */
  const hoveredId = ref<NodeId | null>(null)
  /** История undo/redo: заменяется целиком, поэтому достаточно shallowRef. */
  const history = shallowRef(emptyHistory<HistorySnapshot>())

  /** Есть шаг для отмены. */
  const canUndo = computed(() => history.value.past.length > 0)
  /** Есть шаг для повтора. */
  const canRedo = computed(() => history.value.future.length > 0)

  /** Выделенный узел или `undefined`, если выделения нет. */
  const selectedNode = computed<LayoutNode | undefined>(() =>
    selectedId.value === null ? undefined : tree.findNode(document.value, selectedId.value),
  )

  /**
   * Подписи корней по id — имена источников связей. Новая карта на каждую правку документа, поэтому читать её стоит
   * только там, где есть связь (иначе зависимыми станут все узлы).
   */
  const rootLabels = computed(() => rootLabelMap(document.value))

  /** Корневые блоки по id — источники живого зеркала связей. Карта новая на каждую правку, читать только у связей. */
  const rootNodes = computed(() => new Map(document.value.roots.map((root) => [root.node.id, root.node])))

  /** Путь от корня до выделенного узла включительно; пусто без выделения. */
  const selectedPath = computed<LayoutNode[]>(() =>
    selectedId.value === null ? [] : tree.getPath(document.value, selectedId.value),
  )

  /** Возвращает запись корня, в чьём дереве лежит узел `id`. */
  function rootOf(id: NodeId): RootEntry | undefined {
    const rootId = tree.getPath(document.value, id)[0]?.id
    return rootId === undefined ? undefined : tree.findRootEntry(document.value, rootId)
  }

  /** Текущее состояние для истории. */
  function snapshot(): HistorySnapshot {
    return { document: document.value, selectedId: selectedId.value }
  }

  /**
   * Применяет результат операции: тот же объект документа — ничего не делает и возвращает `false`,
   * иначе записывает шаг истории (снимок до изменения; с `merge` — склейка с предыдущим шагом того же ключа),
   * заменяет документ, ставит `updatedAt` и возвращает `true`. Единая точка записи документа.
   */
  function commit(next: LayoutDocument, merge?: MergeOptions): boolean {
    if (next === document.value) return false
    const now = Date.now()
    history.value = recordStep(history.value, snapshot(), {
      key: merge?.key ?? null,
      now,
      mergeWindow: merge?.window ?? 0,
      limit: HISTORY_LIMIT,
    })
    document.value = { ...next, updatedAt: new Date(now).toISOString() }
    return true
  }

  /**
   * Применяет снимок отмены или повтора: документ (с новым `updatedAt` — это тоже изменение) и выделение
   * того момента, если узел ещё есть; счётчик автоподписей не уменьшается; ховер сбрасывается, если его узла нет. Название документа остаётся
   * текущим: переименование не входит в историю и отменой не откатывается.
   */
  function applyMove(move: HistoryMove<HistorySnapshot> | null): boolean {
    if (move === null) return false
    history.value = move.history
    // Счётчик автоподписей не откатывается: номера, однажды выданные блокам, не переиспользуются
    document.value = {
      ...move.snapshot.document,
      name: document.value.name,
      labelCounter: Math.max(document.value.labelCounter, move.snapshot.document.labelCounter),
      updatedAt: new Date().toISOString(),
    }
    selectedId.value = move.snapshot.selectedId
    dropMissingSelection()
    return true
  }

  /** Отменяет последний шаг; `false`, если отменять нечего. */
  function undo(): boolean {
    return applyMove(undoStep(history.value, snapshot()))
  }

  /** Повторяет отменённый шаг; `false`, если повторять нечего. */
  function redo(): boolean {
    return applyMove(redoStep(history.value, snapshot()))
  }

  /** Сбрасывает выделение и ховер, если их узлов больше нет в документе (удалены сами или вместе с предком). */
  function dropMissingSelection(): void {
    if (selectedId.value !== null && !tree.findNode(document.value, selectedId.value)) selectedId.value = null
    if (hoveredId.value !== null && !tree.findNode(document.value, hoveredId.value)) hoveredId.value = null
  }

  /** Добавляет новый корневой блок в точку поля; `false`, если документ не изменился (например, `width <= 0`). */
  function addRoot(kind: ContainerKind, label: string, at: CanvasPoint, width?: number): boolean {
    return commit(tree.addRoot(document.value, createRootEntry(kind, label, at, width)))
  }

  /** Добавляет новый пустой блок ребёнком `parentId` в конец; `false` при недопустимой цели. */
  function addChild(parentId: NodeId, kind: ContainerKind, label: string): boolean {
    return commit(tree.addChild(document.value, parentId, createBlock(kind, label)))
  }

  /** Создаёт пустой блок без подписи ребёнком `parentId` (в конец), выделяет его и возвращает id; `null` при отказе. */
  function createChild(parentId: NodeId, kind: ContainerKind): NodeId | null {
    const block = createBlock(kind, '')
    if (!commit(tree.addChild(document.value, parentId, block), createMerge(block.id))) return null
    selectedId.value = block.id
    return block.id
  }

  /** Создаёт пустой корневой блок без подписи в точке поля, выделяет его и возвращает id; `null` при отказе. */
  function createRoot(kind: ContainerKind, at: CanvasPoint, width?: number): NodeId | null {
    const entry = createRootEntry(kind, '', at, width)
    if (!commit(tree.addRoot(document.value, entry), createMerge(entry.node.id))) return null
    selectedId.value = entry.node.id
    return entry.node.id
  }

  /**
   * Записывает подпись блока; пустая (после обрезки пробелов) заменяется автоподписью `Блок-N`,
   * а счётчик документа растёт в той же записи (номера не переиспользуются). `false`, если документ не изменился.
   * Запись склеивается с шагом создания блока (`createRoot`/`createChild`), если он последний в истории.
   */
  function setLabelOrAuto(id: NodeId, text: string): boolean {
    const label = text.trim()
    if (label !== '') return commit(tree.updateNode(document.value, id, { label }), createMerge(id))
    const auto = nextAutoLabel(document.value)
    const next = tree.updateNode(document.value, id, { label: auto.label })
    return commit(next === document.value ? next : { ...next, labelCounter: auto.labelCounter }, createMerge(id))
  }

  /**
   * Вставляет копию поддерева ребёнком `parentId` (в конец) с новыми id и выделяет её; связи на удалённые корни
   * из копии выбрасываются.
   * Возвращает id копии или `null` при отказе (нет блока-родителя).
   */
  function pasteChild(parentId: NodeId, copied: LayoutNode): NodeId | null {
    const node = tree.cloneSubtree(withoutDanglingLinks(copied, document.value))
    if (!commit(tree.addChild(document.value, parentId, node))) return null
    selectedId.value = node.id
    return node.id
  }

  /** Вставляет копию блока новым корнем в точку поля (шириной `width`) и выделяет; `null` при отказе. */
  function pasteRoot(copied: LayoutNode, at: CanvasPoint, width: number): NodeId | null {
    const node = tree.cloneSubtree(withoutDanglingLinks(copied, document.value))
    const canvas = { x: at.x, y: at.y, width, height: null, exportMaxWidth: false }
    if (!commit(tree.addRoot(document.value, { canvas, node }))) return null
    selectedId.value = node.id
    return node.id
  }

  /**
   * Вставляет фрагмент из буфера обмена (17.4) одним шагом истории: сначала недостающие корни-источники его связей
   * (со своими id, столбиком справа от точки `at`), затем копию блока с новыми id — ребёнком `parentId` или новым
   * корнем в точке `at` шириной `width`. Связи на источники, которых так и нет, отбрасываются. `null` при отказе.
   */
  function pasteFragment(
    fragment: LayoutFragment,
    parentId: NodeId | null,
    at: CanvasPoint,
    width: number,
  ): NodeId | null {
    const sourcesAt = { x: at.x + width + IMPORTED_SOURCE_GAP, y: at.y }
    const withSources = withFragmentSources(document.value, fragment.sources, sourcesAt)
    const node = tree.cloneSubtree(withoutDanglingLinks(fragment.node, withSources))
    const canvas = { x: at.x, y: at.y, width, height: null, exportMaxWidth: false }
    const next =
      parentId === null ? tree.addRoot(withSources, { canvas, node }) : tree.addChild(withSources, parentId, node)
    // Блок не встал (нет родителя, отказ правил дерева) — источники одни не добавляем
    if (next === withSources || !commit(next)) return null
    selectedId.value = node.id
    return node.id
  }

  /** Удаляет узел с поддеревом и снимает выделение и ховер, если они указывали на удалённое. */
  function removeNode(id: NodeId): boolean {
    const changed = commit(tree.removeNode(document.value, id))
    if (changed) dropMissingSelection()
    return changed
  }

  /** Дублирует узел и выделяет копию; `false`, если дублировать нечего. */
  function duplicateNode(id: NodeId): boolean {
    const { document: next, copyId } = tree.duplicateNode(document.value, id)
    const changed = commit(next)
    if (changed && copyId !== null) selectedId.value = copyId
    return changed
  }

  /** Перемещает узел в новую цель (ребёнком блока или на канвас); `false` при недопустимом перемещении. */
  function moveNode(id: NodeId, target: MoveTarget): boolean {
    return commit(tree.moveNode(document.value, id, target))
  }

  /** Вставляет копию узла в цель drop (Alt при отпускании); выделяет копию. `null` при отказе или no-op. */
  function copyNodeToTarget(id: NodeId, target: MoveTarget): NodeId | null {
    const { document: next, copyId } = tree.copyNodeToTarget(document.value, id, target)
    if (!commit(next) || copyId === null) return null
    selectedId.value = copyId
    return copyId
  }

  /** Склейка правок одних и тех же полей объекта подряд: ключ — префикс, id и список изменённых полей. */
  function fieldMerge(prefix: string, id: NodeId, before: object | undefined, after: object | undefined): MergeOptions {
    const fields = before && after ? changedFields(before, after).join(',') : ''
    return { key: `${prefix}:${id}:${fields}`, window: HISTORY_MERGE_MS }
  }

  /**
   * Правит поля узла (см. `updateNode`); `false`, если ничего не изменилось. Частые правки одного поля — один шаг;
   * `mergeKey` (сеанс набора в поле) склеивает все записи сеанса в один шаг без ограничения по времени.
   */
  function updateNode(id: NodeId, patch: NodePatch, mergeKey: string | null = null): boolean {
    const next = tree.updateNode(document.value, id, patch)
    if (next === document.value) return false
    if (mergeKey !== null) return commit(next, { key: mergeKey, window: UNLIMITED_MERGE_WINDOW })
    return commit(next, fieldMerge('node', id, tree.findNode(document.value, id), tree.findNode(next, id)))
  }

  /** Правит положение и размер корня на поле; `false`, если ничего не изменилось. Частые правки одного поля — один шаг. */
  function updateRootPlacement(rootId: NodeId, patch: Partial<CanvasPlacement>): boolean {
    const next = tree.updateRootPlacement(document.value, rootId, patch)
    if (next === document.value) return false
    const before = tree.findRootEntry(document.value, rootId)?.canvas
    return commit(next, fieldMerge('placement', rootId, before, tree.findRootEntry(next, rootId)?.canvas))
  }

  /**
   * Заменяет документ проверенным (parseDocument), сбрасывает выделение, ховер и историю (новый документ
   * нельзя отменить в старый); при ошибке документ не меняется.
   */
  function loadDocument(data: unknown): ParseDocumentResult {
    const result = parseDocument(data)
    if (!result.ok) return result
    document.value = result.document
    history.value = emptyHistory()
    selectedId.value = null
    hoveredId.value = null
    return result
  }

  /**
   * Переименовывает документ (без записи в историю). Пустое после обрезки пробелов имя и то же имя — отказ
   * (`false`, документ не меняется). Меняет `updatedAt`, как любая правка.
   */
  function renameDocument(name: string): boolean {
    const next = name.trim()
    if (next === '' || next === document.value.name) return false
    document.value = { ...document.value, name: next, updatedAt: new Date().toISOString() }
    return true
  }

  /**
   * Задаёт правила документа для ИИ (идут в промпт экспорта). Это правка документа: шаг истории, набор подряд
   * склеивается в один шаг. `false`, если текст тот же.
   */
  function setDocumentRules(rules: string): boolean {
    if (rules === document.value.rules) return false
    return commit({ ...document.value, rules }, { key: RULES_MERGE_KEY, window: HISTORY_MERGE_MS })
  }

  /** Выделяет узел; `null` снимает выделение. Несуществующий id снимает выделение. */
  function select(id: NodeId | null): void {
    selectedId.value = id === null || tree.findNode(document.value, id) ? id : null
  }

  /** Подсвечивает узел под курсором; `null` снимает подсветку. */
  function hover(id: NodeId | null): void {
    hoveredId.value = id
  }

  /** Ставит связь на корень `sourceId` в блок `parentId` на позицию `index` и выделяет её; `null`, если нельзя (цикл и т. п.). */
  function addLink(parentId: NodeId, sourceId: NodeId, index: number): NodeId | null {
    const link = createLinkBlock(sourceId)
    if (!commit(tree.addChild(document.value, parentId, link, index))) return null
    selectedId.value = link.id
    return link.id
  }

  /**
   * «Вынести на канвас»: вложенный блок становится корнем в `target`, на его месте — связь на него (один шаг истории);
   * выделяется связь, стрелка от нового корня показывает, куда он делся. `false`, если нельзя.
   */
  function extractToCanvas(nodeId: NodeId, target: ExtractTarget): boolean {
    const link = createLinkBlock(nodeId)
    if (!commit(extract.extractToCanvas(document.value, nodeId, link, target))) return false
    selectedId.value = link.id
    return true
  }

  return {
    document,
    selectedId,
    hoveredId,
    selectedNode,
    selectedPath,
    rootLabels,
    rootNodes,
    canUndo,
    canRedo,
    rootOf,
    undo,
    redo,
    addRoot,
    addChild,
    createChild,
    createRoot,
    setLabelOrAuto,
    pasteChild,
    pasteRoot,
    pasteFragment,
    addLink,
    extractToCanvas,
    removeNode,
    duplicateNode,
    moveNode,
    copyNodeToTarget,
    updateNode,
    updateRootPlacement,
    loadDocument,
    renameDocument,
    setDocumentRules,
    select,
    hover,
  }
})
