/**
 * Pinia-хранилище страницы canvas: текущий документ, выделение и ховер. Экшены — тонкие обёртки над
 * чистыми операциями `tree.ts`; DOM и localStorage здесь не трогаем (автосохранение — 5.4).
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { parseDocument, type ParseDocumentResult } from '@shared'
import type { CanvasPlacement, ContainerKind, LayoutDocument, LayoutNode, NodeId, RootEntry } from '@shared'
import { createBlock, createDocument, createRootEntry, type CanvasPoint } from './factories'
import { rootLabels } from './node-view'
import * as tree from './tree'
import type { MoveTarget, NodePatch } from './tree'

export const useLayoutStore = defineStore('layout', () => {
  /** Текущий документ. */
  const document = ref<LayoutDocument>(createDocument())
  /** Id выделенного узла. */
  const selectedId = ref<NodeId | null>(null)
  /** Id узла под курсором. */
  const hoveredId = ref<NodeId | null>(null)

  /** Выделенный узел или `undefined`, если выделения нет. */
  const selectedNode = computed<LayoutNode | undefined>(() =>
    selectedId.value === null ? undefined : tree.findNode(document.value, selectedId.value),
  )

  /** Подписи корней по id: общий кеш для плашек связей. */
  const rootLabelMap = computed(() => rootLabels(document.value))

  /** Путь от корня до выделенного узла включительно; пусто без выделения. */
  const selectedPath = computed<LayoutNode[]>(() =>
    selectedId.value === null ? [] : tree.getPath(document.value, selectedId.value),
  )

  /** Возвращает запись корня, в чьём дереве лежит узел `id`. */
  function rootOf(id: NodeId): RootEntry | undefined {
    const rootId = tree.getPath(document.value, id)[0]?.id
    return rootId === undefined ? undefined : tree.findRootEntry(document.value, rootId)
  }

  /**
   * Применяет результат операции: тот же объект документа — ничего не делает и возвращает `false`,
   * иначе заменяет документ, ставит `updatedAt` и возвращает `true`.
   * Единая точка записи: сюда в 5.3 встанет история undo/redo.
   */
  function commit(next: LayoutDocument): boolean {
    if (next === document.value) return false
    document.value = { ...next, updatedAt: new Date().toISOString() }
    return true
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

  /** Правит поля узла (см. `updateNode`); `false`, если ничего не изменилось. */
  function updateNode(id: NodeId, patch: NodePatch): boolean {
    return commit(tree.updateNode(document.value, id, patch))
  }

  /** Правит положение и размер корня на поле; `false`, если ничего не изменилось. */
  function updateRootPlacement(rootId: NodeId, patch: Partial<CanvasPlacement>): boolean {
    return commit(tree.updateRootPlacement(document.value, rootId, patch))
  }

  /** Заменяет документ проверенным (parseDocument), сбрасывает выделение и ховер; при ошибке документ не меняется. */
  function loadDocument(data: unknown): ParseDocumentResult {
    const result = parseDocument(data)
    if (!result.ok) return result
    document.value = result.document
    selectedId.value = null
    hoveredId.value = null
    return result
  }

  /** Выделяет узел; `null` снимает выделение. Несуществующий id снимает выделение. */
  function select(id: NodeId | null): void {
    selectedId.value = id === null || tree.findNode(document.value, id) ? id : null
  }

  /** Подсвечивает узел под курсором; `null` снимает подсветку. */
  function hover(id: NodeId | null): void {
    hoveredId.value = id
  }

  return {
    document,
    selectedId,
    hoveredId,
    selectedNode,
    selectedPath,
    rootLabelMap,
    rootOf,
    addRoot,
    addChild,
    removeNode,
    duplicateNode,
    moveNode,
    updateNode,
    updateRootPlacement,
    loadDocument,
    select,
    hover,
  }
})
