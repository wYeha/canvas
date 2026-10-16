/**
 * Composable поиска приёмника при перетаскивании узла: хит-тест элемента под курсором, выбор приёмника
 * чистой `resolveDropTarget`, позиция вставки во flex-блок (`flexInsertIndex` по замеру прямых детей приёмника,
 * координаты страницы) и запись в стор; пересчёт при смене камеры и документа без движения мыши.
 * Даёт цель переноса на пустое поле для отпускания. Подключается из `use-canvas-dnd.ts`.
 */

import { watch } from 'vue'
import type { NodeId } from '@shared'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { elementAtPoint, measureChildClientRects, nodeChainFromTarget } from '@/scripts/pages/canvas/node-dom'
import { findNode, findRootEntry } from '@/scripts/pages/canvas/tree-query'
import { canvasMoveTarget, type CanvasMove } from './dnd-geometry'
import { useDragStore } from './drag-store'
import { resolveDropTarget, type DropHit, type DropTarget } from './drop-target'
import { flexInsertIndex } from './flex-insert'

/** Поиск приёмника: пересчёт по точке страницы и цель переноса на поле при отпускании. */
export interface DropTargetApi {
  refreshTarget: (client: CanvasPoint) => void
  nodeDropMove: (pointer: CanvasPoint) => CanvasMove | null
}

/** Подключает поиск приёмника; `isSurface` отличает поверхность поля от плавающих панелей. */
export function useDropTarget(isSurface: (target: EventTarget | null) => boolean): DropTargetApi {
  const dragStore = useDragStore()
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  /** Последняя точка указателя на странице: по ней пересчитываем цель, когда мышь стоит, а поле поменялось. */
  let lastClient: CanvasPoint = { x: 0, y: 0 }

  /** Что под точкой страницы: цепочка узлов над поверхностью поля, `null` — над панелями, хедером, вне окна. */
  function hitAt(client: CanvasPoint): DropHit {
    const el = elementAtPoint(client)
    return isSurface(el) ? { chain: nodeChainFromTarget(el) } : null
  }

  /**
   * Позиция вставки узла `draggedId` в блок `parentId` под точкой страницы: только для flex (grid — 7.5);
   * блок не блок, не flex или не отрисован — `null`. Собственный ребёнок-узел исключается из расчёта.
   */
  function insertIndexIn(parentId: NodeId, draggedId: NodeId, client: CanvasPoint): number | null {
    const parent = findNode(layoutStore.document, parentId)
    if (parent?.type !== 'block' || parent.container.kind !== 'flex') return null
    const ids = parent.children.map((child) => child.id)
    const rects = measureChildClientRects(parentId, ids)
    if (rects === null) return null
    const from = ids.indexOf(draggedId)
    const { direction, wrap } = parent.container
    return flexInsertIndex({ direction, wrap, rects, pointer: client, skip: from === -1 ? null : from })
  }

  /** Приёмник для узла `nodeId` под точкой страницы; у блока — с позицией вставки. */
  function targetAt(nodeId: NodeId, client: CanvasPoint): DropTarget | null {
    const base = resolveDropTarget(layoutStore.document, nodeId, hitAt(client))
    if (base?.kind !== 'block') return base
    return { ...base, index: insertIndexIn(base.id, nodeId, client) }
  }

  /** Пересчитывает приёмник для перетаскиваемого узла по точке страницы; при других жестах ничего не делает. */
  function refreshTarget(client: CanvasPoint): void {
    lastClient = { x: client.x, y: client.y }
    const session = dragStore.session
    if (session?.kind !== 'node') return
    dragStore.setDropTarget(targetAt(session.nodeId, client))
  }

  /** Пересчёт по последней точке, если идёт перетаскивание узла (камера или документ сменились без движения мыши). */
  function refreshAtLast(): void {
    if (dragStore.session?.kind === 'node') refreshTarget(lastClient)
  }

  /**
   * Цель переноса при отпускании в точке `pointer` (экран viewport): только если приёмник — пустое поле;
   * над блоком (перенос внутрь по `dropTarget.index` — 7.6) и там, где нельзя, — `null`.
   */
  function nodeDropMove(pointer: CanvasPoint): CanvasMove | null {
    const session = dragStore.session
    if (session?.kind !== 'node' || dragStore.dropTarget?.kind !== 'canvas') return null
    const isRoot = findRootEntry(layoutStore.document, session.nodeId) !== undefined
    return canvasMoveTarget(session.grab, pointer, cameraStore.camera, isRoot)
  }

  // После перерисовки: слой мира уже с новым transform, DOM — с новым документом
  watch(() => cameraStore.camera, refreshAtLast, { flush: 'post' })
  watch(() => layoutStore.document, refreshAtLast, { flush: 'post' })

  return { refreshTarget, nodeDropMove }
}
