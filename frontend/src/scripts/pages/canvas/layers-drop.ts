/**
 * Чистая логика перетаскивания в панели «Слои»: зоны строки (трети), запреты, цель `MoveTarget` и геометрия линии вставки.
 * Без Vue, Pinia и DOM.
 */
import type { LayoutDocument, NodeId } from '@shared'
import type { Rect } from '@/scripts/pages/canvas/camera'
import {
  LAYER_DROP_LINE_WIDTH,
  LAYER_DROP_ZONE_AFTER_RATIO,
  LAYER_DROP_ZONE_BEFORE_RATIO,
  LAYER_INDENT_PX,
  LAYER_TOGGLE_WIDTH_PX,
} from './constants'
import { canMoveNode, findNode, findParent, locateNode, type MoveTarget } from './tree'
import { isDescendant } from './tree-query'

/** Зона отпускания относительно строки «Слоёв». */
export type LayerDropZone = 'before' | 'inside' | 'after'

/**
 * Зона по локальной Y внутри строки: верхняя треть — «до», нижняя — «после», середина `[h/3, 2h/3)` — «внутрь».
 */
export function layerDropZone(localY: number, rowHeight: number): LayerDropZone {
  if (rowHeight <= 0) return 'inside'
  const beforeEdge = rowHeight * LAYER_DROP_ZONE_BEFORE_RATIO
  const afterEdge = rowHeight * LAYER_DROP_ZONE_AFTER_RATIO
  if (localY < beforeEdge) return 'before'
  if (localY >= afterEdge) return 'after'
  return 'inside'
}

/** Нельзя отпускать на саму строку или на её потомка в списке. */
export function isLayersDropForbidden(doc: LayoutDocument, draggedId: NodeId, overId: NodeId): boolean {
  return overId === draggedId || isDescendant(doc, draggedId, overId)
}

/** Цель вставки «внутрь» блока (последний ребёнок). */
function insideTarget(doc: LayoutDocument, overId: NodeId): MoveTarget | null {
  const node = findNode(doc, overId)
  if (node?.type !== 'block') return null
  return { type: 'child', parentId: overId, index: node.children.length }
}

/** Цель «до» / «после» корневой строки (порядок в `roots`, координаты на поле те же). */
function rootSiblingTarget(doc: LayoutDocument, overId: NodeId, zone: 'before' | 'after'): MoveTarget | null {
  const loc = locateNode(doc, overId)
  const root = loc === undefined ? undefined : doc.roots[loc.rootIndex]
  if (loc === undefined || root === undefined || loc.indices.length > 0) return null
  const rootIndex = zone === 'before' ? loc.rootIndex : loc.rootIndex + 1
  return { type: 'canvas', at: { x: root.canvas.x, y: root.canvas.y }, rootIndex }
}

/** Цель «до» / «после» вложенной строки среди детей родителя (индекс до изъятия). */
function childSiblingTarget(doc: LayoutDocument, overId: NodeId, zone: 'before' | 'after'): MoveTarget | null {
  const parent = findParent(doc, overId)
  const from = locateNode(doc, overId)?.indices.at(-1)
  if (parent === undefined || from === undefined) return null
  const index = zone === 'before' ? from : from + 1
  return { type: 'child', parentId: parent.id, index }
}

/** Цель соседней вставки по зоне «до» или «после». */
function siblingTarget(doc: LayoutDocument, overId: NodeId, zone: 'before' | 'after'): MoveTarget | null {
  return findParent(doc, overId) === undefined
    ? rootSiblingTarget(doc, overId, zone)
    : childSiblingTarget(doc, overId, zone)
}

/**
 * Цель переноса из строки «Слоёв»; `null`, если отпускание недопустимо или `canMoveNode` отказывает.
 */
export function layersMoveTarget(
  doc: LayoutDocument,
  draggedId: NodeId,
  overId: NodeId,
  zone: LayerDropZone,
): MoveTarget | null {
  if (isLayersDropForbidden(doc, draggedId, overId)) return null
  const raw =
    zone === 'inside' ? insideTarget(doc, overId) : siblingTarget(doc, overId, zone === 'before' ? 'before' : 'after')
  if (raw === null) return null
  return canMoveNode(doc, draggedId, raw) === null ? raw : null
}

/** Допустимо ли отпускание в текущей зоне (для приглушения строк и красного призрака). */
export function layersDropAllowed(
  doc: LayoutDocument,
  draggedId: NodeId,
  overId: NodeId,
  zone: LayerDropZone,
): boolean {
  return layersMoveTarget(doc, draggedId, overId, zone) !== null
}

/**
 * Прямоугольник горизонтальной линии вставки в client-координатах; только для `before` / `after`.
 */
export function layerDropLineRect(rowRect: Rect, zone: 'before' | 'after', depth: number): Rect {
  const inset = LAYER_TOGGLE_WIDTH_PX + depth * LAYER_INDENT_PX
  const thickness = LAYER_DROP_LINE_WIDTH
  const y = zone === 'before' ? rowRect.y : rowRect.y + rowRect.height - thickness
  const width = Math.max(rowRect.width - inset, thickness)
  return { x: rowRect.x + inset, y, width, height: thickness }
}
