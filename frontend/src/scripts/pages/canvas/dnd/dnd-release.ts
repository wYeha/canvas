/**
 * Чистая цель переноса узла при отпускании: по сессии перетаскивания и текущему приёмнику в сторе.
 * Без Vue, Pinia и DOM.
 */
import type { Camera } from '@/scripts/pages/canvas/camera'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'
import type { MoveTarget } from '@/scripts/pages/canvas/tree-types'
import { canvasMoveTarget, type DragGrab } from './dnd-geometry'
import type { DropTarget } from './drop-target'

/** Минимум сессии узла для отпускания (захват и вид жеста). */
export interface NodeReleaseSession {
  kind: 'node'
  grab: DragGrab
}

/**
 * Цель `moveNode` при отпускании перетаскиваемого узла: поле (`canvas`), вложение в блок (`child`)
 * или `null` (нет приёмника, `index === null`, не узловый жест).
 */
export function releaseNodeMoveTarget(
  session: NodeReleaseSession | null,
  target: DropTarget | null,
  pointer: CanvasPoint,
  camera: Camera,
  draggedIsRoot: boolean,
): MoveTarget | null {
  if (session === null) return null
  if (target === null) return null
  if (target.kind === 'canvas') {
    return canvasMoveTarget(session.grab, pointer, camera, draggedIsRoot)
  }
  if (target.index !== null) {
    return { type: 'child', parentId: target.id, index: target.index }
  }
  return null
}
