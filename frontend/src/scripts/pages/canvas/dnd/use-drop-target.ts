/**
 * Composable поиска приёмника при перетаскивании узла: хит-тест элемента под курсором, выбор приёмника
 * чистой `resolveDropTarget`, позиция вставки во flex- и grid-блок (`flexInsertIndex` / `gridInsertIndex` по замеру
 * прямых детей приёмника, координаты страницы) и запись в стор; пересчёт при смене камеры и документа без движения мыши.
 * Даёт цель переноса на пустое поле для отпускания. Подключается из `use-canvas-dnd.ts`.
 */

import { watch } from 'vue'
import type { NodeId } from '@shared'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { elementAtPoint, measureChildClientRects, nodeChainFromTarget } from '@/scripts/pages/canvas/node-dom'
import { findNode, findRootEntry } from '@/scripts/pages/canvas/tree-query'
import { releaseNodeMoveTarget } from './dnd-release'
import type { MoveTarget } from '@/scripts/pages/canvas/tree-types'
import { useDragStore } from './drag-store'
import { resolveDropTarget, type DropHit, type DropTarget } from './drop-target'
import { flexInsertIndex } from './flex-insert'
import { gridInsertIndex } from './grid-insert'

/** Опции пересчёта приёмника: при копии (Alt) перетаскиваемый ребёнок не исключается из расчёта индекса. */
export interface RefreshTargetOptions {
  forCopy?: boolean
}

/** Поиск приёмника: пересчёт по точке страницы и цель переноса на поле при отпускании. */
export interface DropTargetApi {
  refreshTarget: (client: CanvasPoint, options?: RefreshTargetOptions) => void
  nodeDropMove: (pointer: CanvasPoint) => MoveTarget | null
}

/** Подключает поиск приёмника; `isSurface` отличает поверхность поля от плавающих панелей. */
export function useDropTarget(isSurface: (target: EventTarget | null) => boolean): DropTargetApi {
  const dragStore = useDragStore()
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  /** Последняя точка указателя на странице: по ней пересчитываем цель, когда мышь стоит, а поле поменялось. */
  let lastClient: CanvasPoint = { x: 0, y: 0 }
  /** Режим копии (Alt) с последнего `refreshTarget` — для пересчёта без движения мыши. */
  let lastForCopy = false

  /** Что под точкой страницы: цепочка узлов над поверхностью поля, `null` — над панелями, хедером, вне окна. */
  function hitAt(client: CanvasPoint): DropHit {
    const el = elementAtPoint(client)
    return isSurface(el) ? { chain: nodeChainFromTarget(el) } : null
  }

  /**
   * Позиция вставки узла `draggedId` в блок `parentId` под точкой страницы: flex и grid;
   * блок не блок, другой вид контейнера или не отрисован — `null`. Собственный ребёнок исключается из расчёта.
   */
  function insertIndexIn(parentId: NodeId, draggedId: NodeId, client: CanvasPoint, forCopy: boolean): number | null {
    const parent = findNode(layoutStore.document, parentId)
    if (parent?.type !== 'block') return null
    const ids = parent.children.map((child) => child.id)
    const rects = measureChildClientRects(parentId, ids)
    if (rects === null) return null
    const from = ids.indexOf(draggedId)
    const skip = forCopy ? null : from === -1 ? null : from
    const container = parent.container
    switch (container.kind) {
      case 'flex': {
        const { direction, wrap } = container
        return flexInsertIndex({ direction, wrap, rects, pointer: client, skip })
      }
      case 'grid':
        return gridInsertIndex({ rects, pointer: client, skip })
      default:
        return null
    }
  }

  /** Приёмник для узла `nodeId` под точкой страницы; у блока — с позицией вставки. */
  function targetAt(nodeId: NodeId, client: CanvasPoint, forCopy: boolean): DropTarget | null {
    const base = resolveDropTarget(layoutStore.document, nodeId, hitAt(client))
    if (base?.kind !== 'block') return base
    return { ...base, index: insertIndexIn(base.id, nodeId, client, forCopy) }
  }

  /** Пересчитывает приёмник для перетаскиваемого узла по точке страницы; при других жестах ничего не делает. */
  function refreshTarget(client: CanvasPoint, options?: RefreshTargetOptions): void {
    lastClient = { x: client.x, y: client.y }
    const forCopy = options?.forCopy ?? false
    lastForCopy = forCopy
    const session = dragStore.session
    if (session?.kind !== 'node') return
    dragStore.setDropTarget(targetAt(session.nodeId, client, forCopy))
  }

  /** Пересчёт по последней точке, если идёт перетаскивание узла (камера или документ сменились без движения мыши). */
  function refreshAtLast(): void {
    if (dragStore.session?.kind === 'node') refreshTarget(lastClient, { forCopy: lastForCopy })
  }

  /**
   * Цель переноса при отпускании в точке `pointer` (экран viewport): поле — `canvas`, блок с индексом — `child`,
   * иначе `null` (нет приёмника, `index === null`, панель).
   */
  function nodeDropMove(pointer: CanvasPoint): MoveTarget | null {
    const session = dragStore.session
    if (session?.kind !== 'node') return null
    const isRoot = findRootEntry(layoutStore.document, session.nodeId) !== undefined
    return releaseNodeMoveTarget(session, dragStore.dropTarget, pointer, cameraStore.camera, isRoot)
  }

  // После перерисовки: слой мира уже с новым transform, DOM — с новым документом
  watch(() => cameraStore.camera, refreshAtLast, { flush: 'post' })
  watch(() => layoutStore.document, refreshAtLast, { flush: 'post' })

  return { refreshTarget, nodeDropMove }
}
