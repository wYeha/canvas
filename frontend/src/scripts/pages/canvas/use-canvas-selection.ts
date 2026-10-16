/**
 * Composable оверлея выделения: рамки и бейджи выделенного и наведённого блока в экранных координатах viewport.
 * Прямоугольники берутся из DOM (getBoundingClientRect) и пересчитываются при смене камеры, документа,
 * выделения, наведения и размера поля, поэтому толщина рамок и размер бейджей от зума не зависят.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { LayoutDocument, NodeId } from '@shared'
import { useCameraStore } from './camera-store'
import { useDragStore } from './dnd/drag-store'
import { useLayoutStore } from './layout-store'
import { clientRectOf, findNodeElement } from './node-dom'
import { isBadgeInside, overlayRectStyle, selectionBadgeText, sizeText, toLocalRect, visibleHoverId } from './selection'
import { findNode } from './tree-query'

/** Рамка оверлея для шаблона: классы, стиль положения, текст и классы бейджа. */
export interface SelectionBox {
  kind: 'selected' | 'hover'
  classes: string[]
  style: Record<string, string>
  badge: string
  badgeClasses: string[]
}

/** Возвращает ref элемента оверлея и список рамок для отрисовки. */
export function useCanvasSelection() {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const { document: doc, selectedId, hoveredId } = storeToRefs(layoutStore)
  const { camera, rootHeights } = storeToRefs(cameraStore)
  const dragStore = useDragStore()
  /** Элемент оверлея: его положение на странице — начало экранных координат. */
  const overlayEl = ref<HTMLElement | null>(null)
  /** Рамки для отрисовки: наведение, затем выделение. */
  const boxes = ref<SelectionBox[]>([])
  let resizeObserver: ResizeObserver | null = null
  let frame: number | null = null

  /** Собирает рамку узла `id` или `null`, если узла или его элемента нет. */
  function buildBox(
    kind: SelectionBox['kind'],
    id: NodeId,
    origin: DOMRect,
    document: LayoutDocument,
  ): SelectionBox | null {
    const node = findNode(document, id)
    const el = findNodeElement(id)
    if (node === undefined || el === null) return null
    const rect = toLocalRect(clientRectOf(el), { x: origin.left, y: origin.top, width: 0, height: 0 })
    const size = sizeText(rect, camera.value.zoom)
    const inside = isBadgeInside(rect)
    return {
      kind,
      classes: ['canvas-selection__box', `canvas-selection__box--${kind}`],
      style: overlayRectStyle(rect),
      badge: kind === 'selected' ? selectionBadgeText(document, node, size) : size,
      badgeClasses: [
        'canvas-selection__badge',
        `canvas-selection__badge--${kind}`,
        ...(inside ? ['canvas-selection__badge--inside'] : []),
      ],
    }
  }

  /** Пересчитывает рамки по текущему DOM. */
  function recompute(): void {
    const origin = overlayEl.value?.getBoundingClientRect()
    // Во время перетаскивания рамки скрыты: сплошная рамка выделения закрыла бы пунктирный след блока на месте
    if (origin === undefined || dragStore.isDragging) {
      boxes.value = []
      return
    }
    const entries: [SelectionBox['kind'], NodeId | null][] = [
      ['hover', visibleHoverId(hoveredId.value, selectedId.value)],
      ['selected', selectedId.value],
    ]
    boxes.value = entries.flatMap(([kind, id]) => {
      const box = id === null ? null : buildBox(kind, id, origin, doc.value)
      return box === null ? [] : [box]
    })
  }

  /** Откладывает пересчёт на кадр: ресайзы и события окна склеиваются в один. */
  function schedule(): void {
    if (frame !== null) return
    frame = requestAnimationFrame(() => {
      frame = null
      recompute()
    })
  }

  // Камера, документ, выделение и наведение: после обновления DOM и в том же кадре, чтобы рамка не отставала при пане.
  // Замеры корней — размеры блоков могли поменяться без смены документа.
  watch([camera, doc, selectedId, hoveredId, rootHeights, () => dragStore.isDragging], recompute, { flush: 'post' })

  onMounted(() => {
    window.addEventListener('resize', schedule)
    if (overlayEl.value !== null) {
      resizeObserver = new ResizeObserver(schedule)
      resizeObserver.observe(overlayEl.value)
    }
    void nextTick(recompute)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', schedule)
    resizeObserver?.disconnect()
    resizeObserver = null
    if (frame !== null) cancelAnimationFrame(frame)
    frame = null
  })

  return { overlayEl, boxes }
}
