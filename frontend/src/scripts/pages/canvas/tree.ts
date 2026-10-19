/**
 * Чистые операции над деревом документа: добавление, удаление, правка, дублирование (плюс реэкспорт поиска и
 * перемещения). Вход не мутируется; недопустимая или пустая операция возвращает тот же объект `doc`.
 * `updatedAt`, `labelCounter` и `createdAt` здесь не меняются: `updatedAt` ставит хранилище.
 */
import type { CanvasPlacement, LayoutDocument, LayoutNode, NodeId, RootEntry } from '@shared'
import { createId } from '@/scripts/globals/id'
import { DUPLICATE_ROOT_GAP } from './constants'
import { collectDocIds, collectIds, insertAt, nodeAt, removeAtLocation, updateAtLocation } from './tree-internal'
import { findNode, locateNode } from './tree-query'
import type { DuplicateResult, NodePatch, TreeError } from './tree-types'

export * from './tree-query'
export * from './tree-move'
export * from './tree-copy'
export * from './tree-types'

/** Проверяет добавляемое поддерево: id внутри него уникальны и не пересекаются с документом. */
function checkSubtree(doc: LayoutDocument, node: LayoutNode): TreeError | null {
  const docIds = collectDocIds(doc)
  const ids = collectIds(node)
  return new Set(ids).size !== ids.length || ids.some((id) => docIds.has(id)) ? 'duplicate-id' : null
}

/** Проверяет, можно ли добавить узел ребёнком блока `parentId`; возвращает причину отказа или `null`. */
export function canAddChild(doc: LayoutDocument, parentId: NodeId, node: LayoutNode): TreeError | null {
  if (!findNode(doc, parentId)) return 'target-not-found'
  return checkSubtree(doc, node)
}

/** Добавляет узел ребёнком блока на позицию `index` (по умолчанию в конец; индекс зажимается). */
export function addChild(doc: LayoutDocument, parentId: NodeId, node: LayoutNode, index?: number): LayoutDocument {
  if (canAddChild(doc, parentId, node) !== null) return doc
  const loc = locateNode(doc, parentId)
  if (!loc) return doc
  return updateAtLocation(doc, loc, (parent) => ({
    ...parent,
    children: insertAt(parent.children, index ?? parent.children.length, node),
  }))
}

/** Проверяет, можно ли добавить корневой блок: id не пересекаются с документом. Ширина превью здесь не проверяется. */
export function canAddRoot(doc: LayoutDocument, node: RootEntry['node']): TreeError | null {
  return checkSubtree(doc, node)
}

/**
 * Добавляет корневой блок в `roots` на позицию `index` (по умолчанию в конец), если его допускает `canAddRoot`.
 * Ширина превью `<= 0` — тот же `doc`.
 */
export function addRoot(doc: LayoutDocument, entry: RootEntry, index?: number): LayoutDocument {
  if (entry.canvas.width <= 0 || canAddRoot(doc, entry.node) !== null) return doc
  return { ...doc, roots: insertAt(doc.roots, index ?? doc.roots.length, entry) }
}

/** Удаляет узел вместе с поддеревом; корень убирается из `roots`. */
export function removeNode(doc: LayoutDocument, nodeId: NodeId): LayoutDocument {
  const loc = locateNode(doc, nodeId)
  return loc ? removeAtLocation(doc, loc) : doc
}

/** Проверяет, что каждое значение патча `Object.is`-равно текущему значению объекта. */
function isSamePatch(current: object, patch: object): boolean {
  return Object.entries(patch).every(([key, value]) => Object.is((current as Record<string, unknown>)[key], value))
}

/** Убирает из патча ключи со значением `undefined`: «не менять», а не «стереть поле». */
function definedEntries<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Partial<T>
}

/**
 * Правит поля узла поверхностным слиянием: `container`, `self`, `padding` заменяются целиком (так из `self`
 * можно удалить ключ).
 */
export function updateNode(doc: LayoutDocument, nodeId: NodeId, patch: NodePatch): LayoutDocument {
  const loc = locateNode(doc, nodeId)
  const node = loc && nodeAt(doc, loc)
  if (!loc || !node) return doc
  const clean = definedEntries(patch)
  if (isSamePatch(node, clean)) return doc
  return updateAtLocation(doc, loc, (current) => ({ ...current, ...clean }))
}

/**
 * Правит положение и размер корня на поле; `width <= 0`, некорень или пустой патч — тот же `doc`.
 * Ключ со значением `undefined` означает «не менять».
 */
export function updateRootPlacement(
  doc: LayoutDocument,
  rootId: NodeId,
  patch: Partial<CanvasPlacement>,
): LayoutDocument {
  const rootIndex = doc.roots.findIndex((root) => root.node.id === rootId)
  const root = doc.roots[rootIndex]
  if (!root) return doc
  const clean = definedEntries(patch)
  if (clean.width !== undefined && clean.width <= 0) return doc
  if (isSamePatch(root.canvas, clean)) return doc
  const roots = [...doc.roots]
  roots[rootIndex] = { ...root, canvas: { ...root.canvas, ...clean } }
  return { ...doc, roots }
}

/** Копирует поддерево с новыми id у всех узлов; подписи копируются как есть. */
export function cloneSubtree<T extends LayoutNode>(node: T): T {
  return { ...node, id: createId(), children: node.children.map((child) => cloneSubtree(child)) }
}

/** Дублирует корень: копия встаёт в `roots` сразу после оригинала, справа от него на `DUPLICATE_ROOT_GAP`. */
function duplicateRoot(doc: LayoutDocument, rootIndex: number): DuplicateResult {
  const root = doc.roots[rootIndex]
  if (!root) return { document: doc, copyId: null }
  const node = cloneSubtree(root.node)
  const canvas = { ...root.canvas, x: root.canvas.x + root.canvas.width + DUPLICATE_ROOT_GAP }
  return { document: { ...doc, roots: insertAt(doc.roots, rootIndex + 1, { canvas, node }) }, copyId: node.id }
}

/** Дублирует узел с поддеревом: копия встаёт сразу после оригинала. */
export function duplicateNode(doc: LayoutDocument, nodeId: NodeId): DuplicateResult {
  const loc = locateNode(doc, nodeId)
  const node = loc && nodeAt(doc, loc)
  const last = loc?.indices.at(-1)
  if (!loc || !node) return { document: doc, copyId: null }
  if (last === undefined) return duplicateRoot(doc, loc.rootIndex)
  const copy = cloneSubtree(node)
  const parentLoc = { rootIndex: loc.rootIndex, indices: loc.indices.slice(0, -1) }
  const document = updateAtLocation(doc, parentLoc, (parent) => ({
    ...parent,
    children: insertAt(parent.children, last + 1, copy),
  }))
  return document === doc ? { document: doc, copyId: null } : { document, copyId: copy.id }
}
