/** Копирование узла в цель drop без изъятия исходника (Alt при отпускании на канвасе). */
import type { BlockNode, CanvasPlacement, LayoutDocument, NodeId } from '@shared'
import { addChild, addRoot, cloneSubtree } from './tree'
import { findNode, locateNode } from './tree-query'
import { canMoveNode, moveNode } from './tree-move'
import type { MoveTarget } from './tree-types'

/** Цель «на канвас». */
type CanvasTarget = Extract<MoveTarget, { type: 'canvas' }>

/** Ширина нового размещения: переданная, если она положительна, иначе ширина корня-источника. */
function targetWidth(target: CanvasTarget, fallback: number): number {
  return target.width !== undefined && target.width > 0 ? target.width : fallback
}

/** Вставляет подготовленный блок на канвас по тем же правилам, что `attachCanvas` в `tree-move.ts`. */
function copyToCanvas(
  doc: LayoutDocument,
  sourceId: NodeId,
  prepared: BlockNode,
  target: CanvasTarget,
): LayoutDocument {
  const loc = locateNode(doc, sourceId)
  const root = loc && doc.roots[loc.rootIndex]
  if (!loc || !root) return doc
  const wasRoot = loc.indices.length === 0
  const width = targetWidth(target, root.canvas.width)
  const base: CanvasPlacement = wasRoot ? root.canvas : { ...root.canvas, height: null, exportMaxWidth: false }
  const canvas: CanvasPlacement = { ...base, x: target.at.x, y: target.at.y, width }
  const rootIndex = target.rootIndex ?? (wasRoot ? loc.rootIndex : doc.roots.length)
  return addRoot(doc, { canvas, node: prepared }, rootIndex)
}

/**
 * Вставляет клон узла в `target`, исходник не трогает. Те же проверки и no-op «то же место», что у `moveNode`.
 * `copyId` — id корня копии или `null` при отказе или без изменений.
 */
export function copyNodeToTarget(
  doc: LayoutDocument,
  sourceId: NodeId,
  target: MoveTarget,
): { document: LayoutDocument; copyId: NodeId | null } {
  if (canMoveNode(doc, sourceId, target) !== null) return { document: doc, copyId: null }
  if (moveNode(doc, sourceId, target) === doc) return { document: doc, copyId: null }

  const node = findNode(doc, sourceId)
  if (!node) return { document: doc, copyId: null }
  const prepared = cloneSubtree(node)

  if (target.type === 'child') {
    const parent = findNode(doc, target.parentId)
    if (!parent) return { document: doc, copyId: null }
    const index = Math.min(Math.max(target.index, 0), parent.children.length)
    const next = addChild(doc, target.parentId, prepared, index)
    return next === doc ? { document: doc, copyId: null } : { document: next, copyId: prepared.id }
  }

  const next = copyToCanvas(doc, sourceId, prepared, target)
  return next === doc ? { document: doc, copyId: null } : { document: next, copyId: prepared.id }
}
