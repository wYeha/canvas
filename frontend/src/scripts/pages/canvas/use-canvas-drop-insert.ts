/**
 * Composable фрагмента CanvasDropInsert: линия вставки при перетаскивании узла и протягивании связи — положение по `dropTarget.index`
 * и замеру детей приёмника, экранные координаты viewport.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCameraStore } from './camera-store'
import { dropInsertLineStyle } from './dnd/dnd-style'
import { useDragStore } from './dnd/drag-store'
import { insertLineRect, type InsertLineContainer } from './dnd/insert-line'
import { useLayoutStore } from './layout-store'
import { clientRectOf, findNodeElement, measureChildClientRects } from './node-dom'
import { toLocalRect } from './selection'
import { findNode } from './tree-query'

/** Вид линии вставки для шаблона. */
export interface DropInsertView {
  classes: string[]
  style: Record<string, string>
}

/** Возвращает ref оверлея и вид линии (`null` — не показывать). */
export function useCanvasDropInsert() {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const dragStore = useDragStore()
  const { document: doc } = storeToRefs(layoutStore)
  const { camera } = storeToRefs(cameraStore)
  /** Корень оверлея: начало экранных координат. */
  const overlayEl = ref<HTMLElement | null>(null)
  const view = ref<DropInsertView | null>(null)

  /** Пересчитывает линию по текущему DOM и приёмнику. */
  function recompute(): void {
    const session = dragStore.session
    const target = dragStore.dropTarget
    const origin = overlayEl.value?.getBoundingClientRect()
    if (
      origin === undefined ||
      session === null ||
      !dragStore.isTargeting ||
      target?.kind !== 'block' ||
      target.index === null
    ) {
      view.value = null
      return
    }
    const parent = findNode(doc.value, target.id)
    if (!parent) {
      view.value = null
      return
    }
    const childIds = parent.children.map((child) => child.id)
    const rects = measureChildClientRects(target.id, childIds)
    if (rects === null) {
      view.value = null
      return
    }
    const container = parent.container
    let lineContainer: InsertLineContainer
    switch (container.kind) {
      case 'flex':
        lineContainer = { kind: 'flex', direction: container.direction, wrap: container.wrap }
        break
      case 'grid':
        lineContainer = { kind: 'grid' }
        break
      default:
        view.value = null
        return
    }
    const parentEl = findNodeElement(target.id)
    const parentRect = parentEl === null ? null : clientRectOf(parentEl)
    const from = childIds.indexOf(session.nodeId)
    const forCopy = dragStore.dropForCopy
    const skip = forCopy ? null : from === -1 ? null : from
    const clientRect = insertLineRect({
      container: lineContainer,
      rects,
      index: target.index,
      skip,
      parentRect,
    })
    if (clientRect === null) {
      view.value = null
      return
    }
    const local = toLocalRect(clientRect, { x: origin.left, y: origin.top, width: 0, height: 0 })
    const horizontal = local.width >= local.height
    view.value = {
      classes: ['canvas-drop-insert', horizontal ? 'canvas-drop-insert--horizontal' : 'canvas-drop-insert--vertical'],
      style: dropInsertLineStyle(local),
    }
  }

  watch([doc, camera, () => dragStore.dropTarget, () => dragStore.session, () => dragStore.dropForCopy], recompute, {
    flush: 'post',
  })

  onMounted(() => {
    void nextTick(recompute)
  })

  onBeforeUnmount(() => {
    view.value = null
  })

  return { overlayEl, view }
}
