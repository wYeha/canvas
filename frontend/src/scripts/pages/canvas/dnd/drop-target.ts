/**
 * Чистый выбор приёмника при перетаскивании узла: по цепочке id под курсором (от самого глубокого к корню)
 * решает, куда упадёт узел — в блок, на пустое поле или никуда. Без Vue и DOM; правила переноса — `canMoveNode`.
 */

import type { LayoutDocument, NodeId } from '@shared'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'
import { canMoveNode } from '@/scripts/pages/canvas/tree-move'
import { findNode } from '@/scripts/pages/canvas/tree-query'

/**
 * Куда сейчас упадёт перетаскиваемый узел: в блок или на пустое поле; `null` — некуда (или нельзя).
 * У блока `index` — позиция вставки среди его детей (как индекс цели `child` у `moveNode`, до изъятия узла);
 * `null` — позиция не считается (блок не flex/grid, не отрисован; у `resolveDropTarget` всегда `null`).
 */
export type DropTarget = { kind: 'block'; id: NodeId; index: number | null } | { kind: 'canvas' }

/**
 * Что под курсором: цепочка id помеченных узлов (самый глубокий первым, корень последним; `[]` — пустое поле);
 * `null` — курсор не над поверхностью поля (панели, хедер, вне окна).
 */
export type DropHit = { chain: NodeId[] } | null

/** Точка-заглушка для проверки переноса на поле: `canMoveNode` её не читает, важен только тип цели. */
const CANVAS_PROBE_POINT: CanvasPoint = { x: 0, y: 0 }

/**
 * Цепочка без перетаскиваемого поддерева: всё до `draggedId` включительно (сам узел и его потомки — они глубже
 * в DOM) отбрасывается, так курсор над собственным следом «видит» родителя. Без узла в цепочке — она целиком.
 */
function chainOutsideDragged(chain: NodeId[], draggedId: NodeId): NodeId[] {
  const index = chain.indexOf(draggedId)
  return index === -1 ? chain : chain.slice(index + 1)
}

/** Первый id цепочки, который есть в документе и является блоком (плашки связи и устаревшие id пропускаются). */
function firstBlockId(doc: LayoutDocument, chain: NodeId[]): NodeId | null {
  return chain.find((id) => findNode(doc, id)?.type === 'block') ?? null
}

/**
 * Приёмник для узла `draggedId` под курсором `hit`. Блок под курсором (в том числе в другом корне или его заголовок)
 * — приёмник, если в него можно вложить узел; иначе — `null` (подниматься к предкам бессмысленно: отказ из-за
 * самого узла). Блоков в цепочке нет — пустое поле, если узел может стать корнем.
 * Позицию вставки (`index`) здесь не знают — она по DOM, её дополняет вызывающий; тут всегда `null`.
 */
export function resolveDropTarget(doc: LayoutDocument, draggedId: NodeId, hit: DropHit): DropTarget | null {
  if (hit === null) return null
  const blockId = firstBlockId(doc, chainOutsideDragged(hit.chain, draggedId))
  if (blockId !== null) {
    const error = canMoveNode(doc, draggedId, { type: 'child', parentId: blockId, index: 0 })
    return error === null ? { kind: 'block', id: blockId, index: null } : null
  }
  const error = canMoveNode(doc, draggedId, { type: 'canvas', at: CANVAS_PROBE_POINT })
  return error === null ? { kind: 'canvas' } : null
}

/** `true`, если цели одинаковы (оба `null`, оба поле или один и тот же блок с той же позицией вставки). */
export function sameDropTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === null || b === null) return a === b
  if (a.kind === 'block' && b.kind === 'block') return a.id === b.id && a.index === b.index
  return a.kind === b.kind
}
