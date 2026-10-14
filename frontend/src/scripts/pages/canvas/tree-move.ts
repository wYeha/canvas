/** Перемещение узлов: проверка допустимости заранее (для DnD) и сам перенос в блок или на канвас. */
import type { CanvasPlacement, LayoutDocument, LayoutNode, NodeId } from '@shared'
import { insertAt, isLinkSource, nodeAt, removeAtLocation, updateAtLocation } from './tree-internal'
import { findNode, isDescendant, locateNode } from './tree-query'
import type { MoveTarget, NodeLocation, TreeError } from './tree-types'

/** Цель «ребёнком блока». */
type ChildTarget = Extract<MoveTarget, { type: 'child' }>

/** Цель «на канвас». */
type CanvasTarget = Extract<MoveTarget, { type: 'canvas' }>

/** Вынутый из документа узел: документ без него, сам узел, его прежнее положение и размещение его корня. */
interface Detached {
  doc: LayoutDocument
  node: LayoutNode
  loc: NodeLocation
  sourceCanvas: CanvasPlacement
}

/** Проверяет перенос ребёнком блока: цель существует, это блок, не сам узел и не потомок, не корень-источник. */
function checkChildTarget(doc: LayoutDocument, nodeId: NodeId, target: ChildTarget): TreeError | null {
  const parent = findNode(doc, target.parentId)
  if (!parent) return 'target-not-found'
  if (parent.type === 'link') return 'parent-is-link'
  if (target.parentId === nodeId || isDescendant(doc, nodeId, target.parentId)) return 'into-self-or-descendant'
  // Источник — только корневой блок (DESIGN.md): вложение тихо сломало бы связи, которых пользователь не видит
  if (doc.roots.some((root) => root.node.id === nodeId) && isLinkSource(doc, nodeId)) return 'source-into-block'
  return null
}

/**
 * Проверяет, можно ли переместить узел; возвращает причину отказа или `null`.
 * Циклы связей здесь не проверяются: это точка расширения для 8.1.
 */
export function canMoveNode(doc: LayoutDocument, nodeId: NodeId, target: MoveTarget): TreeError | null {
  const node = findNode(doc, nodeId)
  if (!node) return 'node-not-found'
  if (target.type === 'child') return checkChildTarget(doc, nodeId, target)
  return node.type === 'link' ? 'link-to-canvas' : null
}

/** Вынимает узел из документа, запоминая его положение и размещение корня, из которого он вынут. */
function detach(doc: LayoutDocument, loc: NodeLocation): Detached | undefined {
  const node = nodeAt(doc, loc)
  const root = doc.roots[loc.rootIndex]
  if (!node || !root) return undefined
  return { doc: removeAtLocation(doc, loc), node, loc, sourceCanvas: root.canvas }
}

/** Вставляет вынутый узел ребёнком блока на уже скорректированную позицию. */
function attachChild(detached: Detached, parentId: NodeId, index: number): LayoutDocument {
  const loc = locateNode(detached.doc, parentId)
  if (!loc) return detached.doc
  return updateAtLocation(detached.doc, loc, (parent) =>
    parent.type === 'block' ? { ...parent, children: insertAt(parent.children, index, detached.node) } : parent,
  )
}

/**
 * Ставит вынутый блок на канвас. Корень сохраняет `height`/`exportMaxWidth` и по умолчанию своё место в `roots`;
 * вложенный блок становится новым корнем в конце `roots` с шириной корня-источника, если `width` не передана или не положительна.
 */
function attachCanvas(detached: Detached, target: CanvasTarget): LayoutDocument {
  const { node, loc, sourceCanvas } = detached
  if (node.type !== 'block') return detached.doc
  const wasRoot = loc.indices.length === 0
  const width = targetWidth(target, sourceCanvas.width)
  const base: CanvasPlacement = wasRoot ? sourceCanvas : { ...sourceCanvas, height: null, exportMaxWidth: false }
  const canvas: CanvasPlacement = { ...base, x: target.at.x, y: target.at.y, width }
  const rootIndex = target.rootIndex ?? (wasRoot ? loc.rootIndex : detached.doc.roots.length)
  return { ...detached.doc, roots: insertAt(detached.doc.roots, rootIndex, { canvas, node }) }
}

/** Ширина нового размещения: переданная, если она положительна, иначе ширина корня-источника. */
function targetWidth(target: CanvasTarget, fallback: number): number {
  return target.width !== undefined && target.width > 0 ? target.width : fallback
}

/** Возвращает итоговую позицию в списке детей того же родителя или `null`, если узел остаётся на месте. */
function sameParentIndex(from: number, index: number): number | null {
  const to = from < index ? index - 1 : index
  return to === from ? null : to
}

/** Переносит узел ребёнком блока с учётом сдвига индекса внутри того же родителя. */
function moveToChild(doc: LayoutDocument, nodeId: NodeId, target: ChildTarget): LayoutDocument {
  const parent = findNode(doc, target.parentId)
  const loc = locateNode(doc, nodeId)
  if (parent?.type !== 'block' || !loc) return doc
  let index = Math.min(Math.max(target.index, 0), parent.children.length)
  const from = loc.indices.at(-1)
  const parentLoc: NodeLocation = { rootIndex: loc.rootIndex, indices: loc.indices.slice(0, -1) }
  if (from !== undefined && nodeAt(doc, parentLoc)?.id === target.parentId) {
    const to = sameParentIndex(from, index)
    if (to === null) return doc
    index = to
  }
  const detached = detach(doc, loc)
  return detached ? attachChild(detached, target.parentId, index) : doc
}

/** Проверяет, что перенос корня на канвас ничего не меняет: та же точка, ширина и место в `roots`. */
function isSameRootPlacement(doc: LayoutDocument, loc: NodeLocation, target: CanvasTarget): boolean {
  const root = doc.roots[loc.rootIndex]
  if (!root || loc.indices.length > 0) return false
  const { canvas } = root
  const width = targetWidth(target, canvas.width)
  const rootIndex = Math.min(Math.max(target.rootIndex ?? loc.rootIndex, 0), doc.roots.length - 1)
  return canvas.x === target.at.x && canvas.y === target.at.y && canvas.width === width && rootIndex === loc.rootIndex
}

/** Переносит блок на канвас корнем (или двигает и переставляет уже корневой блок). */
function moveToCanvas(doc: LayoutDocument, nodeId: NodeId, target: CanvasTarget): LayoutDocument {
  const loc = locateNode(doc, nodeId)
  if (!loc || isSameRootPlacement(doc, loc, target)) return doc
  const detached = detach(doc, loc)
  return detached ? attachCanvas(detached, target) : doc
}

/**
 * Перемещает узел; недопустимый перенос или перенос на то же место возвращает тот же `doc`.
 *
 * Индекс цели `child` — позиция вставки в **текущем** списке детей (до изъятия узла), `0..children.length`,
 * как её считает DnD по отрисованному списку; вне диапазона зажимается. Если родитель тот же и `from < index`,
 * индекс уменьшается на 1. Для «вверх/вниз»: вверх `index = from - 1`, вниз `index = from + 2`.
 *
 * Цель `canvas`: вложенный блок становится корнем (`width` по умолчанию и при `width <= 0` — ширина корня-источника, `rootIndex` —
 * в конец); корень меняет x/y (и `width`, если передана положительной) и переставляется на `rootIndex`, если он задан
 * (индекс в `roots` после изъятия). `self` узла при любом переносе сохраняется.
 */
export function moveNode(doc: LayoutDocument, nodeId: NodeId, target: MoveTarget): LayoutDocument {
  if (canMoveNode(doc, nodeId, target) !== null) return doc
  return target.type === 'child' ? moveToChild(doc, nodeId, target) : moveToCanvas(doc, nodeId, target)
}
