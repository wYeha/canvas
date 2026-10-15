/**
 * Чистая логика действий над выделенным блоком в панели свойств: доступность (с причиной отказа) и цель
 * перемещения для «выше», «ниже» и «На канвас». Без Vue и Pinia.
 */
import type { LayoutDocument, NodeId } from '@shared'
import { DUPLICATE_ROOT_GAP, NODE_ACTION_REASONS, NODE_ACTIONS } from './constants'
import { canMoveNode, findNode, findParent, locateNode, type MoveTarget } from './tree'

/** Идентификатор действия над блоком. */
export type NodeActionId = (typeof NODE_ACTIONS)[number]['id']

/** Состояние действия: доступно ли оно, а если нет, то почему (текст всплывающей подсказки). */
export interface NodeActionState {
  id: NodeActionId
  disabled: boolean
  reason: string | null
}

/** Положение узла среди соседей: индекс и число соседей (для корня — среди `roots`). */
interface Siblings {
  index: number
  count: number
}

/** Положение узла среди соседей; `null`, если узла нет в документе. */
function siblingsOf(doc: LayoutDocument, nodeId: NodeId): Siblings | null {
  const loc = locateNode(doc, nodeId)
  if (loc === undefined) return null
  const last = loc.indices.at(-1)
  if (last === undefined) return { index: loc.rootIndex, count: doc.roots.length }
  const parent = findParent(doc, nodeId)
  return { index: last, count: parent?.children.length ?? 0 }
}

/** Состояние «выше» / «ниже»: недоступно у крайнего соседа. */
function moveState(id: 'move-up' | 'move-down', siblings: Siblings): NodeActionState {
  const blocked = id === 'move-up' ? siblings.index === 0 : siblings.index === siblings.count - 1
  const reason = id === 'move-up' ? NODE_ACTION_REASONS.first : NODE_ACTION_REASONS.last
  return { id, disabled: blocked, reason: blocked ? reason : null }
}

/** Состояние «На канвас»: только для вложенного блока (корень уже на канвасе, связь корнем быть не может). */
function toCanvasState(doc: LayoutDocument, nodeId: NodeId): NodeActionState {
  const node = findNode(doc, nodeId)
  let reason: string | null = null
  if (node?.type === 'link') reason = NODE_ACTION_REASONS.linkToCanvas
  else if (findParent(doc, nodeId) === undefined) reason = NODE_ACTION_REASONS.alreadyRoot
  return { id: 'to-canvas', disabled: reason !== null, reason }
}

/** Состояния всех действий выделенного узла в порядке показа; пусто, если узла нет в документе. */
export function nodeActionStates(doc: LayoutDocument, nodeId: NodeId): NodeActionState[] {
  const siblings = siblingsOf(doc, nodeId)
  if (siblings === null) return []
  return NODE_ACTIONS.map(({ id }): NodeActionState => {
    if (id === 'move-up' || id === 'move-down') return moveState(id, siblings)
    if (id === 'to-canvas') return toCanvasState(doc, nodeId)
    return { id, disabled: false, reason: null }
  })
}

/** Цель перемещения для «выше» / «ниже» корня: тот же угол на поле, соседнее место в `roots`. */
function rootMoveTarget(doc: LayoutDocument, nodeId: NodeId, delta: number): MoveTarget | null {
  const loc = locateNode(doc, nodeId)
  const root = loc === undefined ? undefined : doc.roots[loc.rootIndex]
  if (loc === undefined || root === undefined) return null
  return { type: 'canvas', at: { x: root.canvas.x, y: root.canvas.y }, rootIndex: loc.rootIndex + delta }
}

/** Цель перемещения для «выше» / «ниже» вложенного узла среди детей родителя (индекс — до изъятия, см. `moveNode`). */
function childMoveTarget(doc: LayoutDocument, nodeId: NodeId, delta: number): MoveTarget | null {
  const parent = findParent(doc, nodeId)
  const from = locateNode(doc, nodeId)?.indices.at(-1)
  if (parent === undefined || from === undefined) return null
  // Вверх: на место предыдущего соседа; вниз: после следующего (+2 из-за сдвига при изъятии узла)
  return { type: 'child', parentId: parent.id, index: delta < 0 ? from - 1 : from + 2 }
}

/** Цель «выше» (`delta = -1`) или «ниже» (`delta = 1`); `null`, если узла нет. */
export function moveTargetFor(doc: LayoutDocument, nodeId: NodeId, delta: -1 | 1): MoveTarget | null {
  const isRoot = findParent(doc, nodeId) === undefined
  return isRoot ? rootMoveTarget(doc, nodeId, delta) : childMoveTarget(doc, nodeId, delta)
}

/** Цель «На канвас»: корень правее корня, в котором лежал блок, на том же уровне; `null`, если перенос недопустим. */
export function toCanvasTarget(doc: LayoutDocument, nodeId: NodeId): MoveTarget | null {
  const rootIndex = locateNode(doc, nodeId)?.rootIndex
  const root = rootIndex === undefined ? undefined : doc.roots[rootIndex]
  if (root === undefined || findParent(doc, nodeId) === undefined) return null
  const target: MoveTarget = {
    type: 'canvas',
    at: { x: root.canvas.x + root.canvas.width + DUPLICATE_ROOT_GAP, y: root.canvas.y },
  }
  return canMoveNode(doc, nodeId, target) === null ? target : null
}
