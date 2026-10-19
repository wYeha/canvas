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
import { resolveDropTarget, resolveLinkTarget, type DropHit, type DropTarget } from './drop-target'
import { flexInsertIndex } from './flex-insert'
import { gridInsertIndex } from './grid-insert'

/** Опции пересчёта приёмника: при копии (Alt) перетаскиваемый ребёнок не исключается из расчёта индекса. */
export interface RefreshTargetOptions {
  forCopy?: boolean
}

/** Куда встанет новая связь: блок-цель и позиция среди его детей. */
export interface LinkDrop {
  parentId: NodeId
  index: number
}

/** Поиск приёмника: пересчёт по точке страницы и цели при отпускании (перенос узла, новая связь). */
export interface DropTargetApi {
  refreshTarget: (client: CanvasPoint, options?: RefreshTargetOptions) => void
  nodeDropMove: (pointer: CanvasPoint) => MoveTarget | null
  linkDrop: () => LinkDrop | null
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

  /**
   * Что под точкой страницы: цепочка узлов над поверхностью поля, `null` — над панелями, хедером, вне окна.
   * Копии повтора (`data-repeat-of`) в цепочку не входят, а позиция вставки считается только по настоящим детям
   * (`measureChildClientRects` ищет `data-node-id`): над копией вставка идёт среди соседей исходного блока.
   */
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
    if (!parent) return null
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

  /**
   * Цель протягиваемой связи на `sourceId` под точкой страницы (с позицией вставки) и блок, который отказал.
   * При перепривязке `linkId` сама связь исключается из расчёта индекса, как перетаскиваемый ребёнок.
   */
  function refreshLinkTarget(sourceId: NodeId, linkId: NodeId | null, client: CanvasPoint): void {
    const { target, deniedId } = resolveLinkTarget(layoutStore.document, sourceId, hitAt(client))
    dragStore.setLinkDenied(deniedId)
    if (target?.kind !== 'block') {
      dragStore.setDropTarget(target)
      return
    }
    // Источник не среди детей цели (иначе был бы цикл): у новой связи исключать из расчёта индекса некого
    dragStore.setDropTarget({ ...target, index: insertIndexIn(target.id, linkId ?? sourceId, client, false) })
  }

  /** Пересчитывает приёмник перетаскиваемого узла или цель протягиваемой связи по точке страницы. */
  function refreshTarget(client: CanvasPoint, options?: RefreshTargetOptions): void {
    lastClient = { x: client.x, y: client.y }
    const forCopy = options?.forCopy ?? false
    lastForCopy = forCopy
    dragStore.dropForCopy = forCopy
    const session = dragStore.session
    if (session?.kind === 'link') refreshLinkTarget(session.nodeId, session.linkId, client)
    if (session?.kind !== 'node') return
    dragStore.setDropTarget(targetAt(session.nodeId, client, forCopy))
  }

  /** Пересчёт по последней точке, если ищется приёмник (камера или документ сменились без движения мыши). */
  function refreshAtLast(): void {
    if (dragStore.isTargeting) refreshTarget(lastClient, { forCopy: lastForCopy })
  }

  /** Куда встанет протягиваемая связь при отпускании: блок-цель с позицией вставки; иначе `null`. */
  function linkDrop(): LinkDrop | null {
    const target = dragStore.dropTarget
    if (dragStore.session?.kind !== 'link' || target?.kind !== 'block' || target.index === null) return null
    return { parentId: target.id, index: target.index }
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

  return { refreshTarget, nodeDropMove, linkDrop }
}
