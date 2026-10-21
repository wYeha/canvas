/**
 * Composable оверлея выделения: рамки и бейджи выделенного и наведённого блока, контуры предков наведённого и
 * затемнение вокруг блока в режиме фокуса (16.7) в экранных координатах viewport.
 * Прямоугольники берутся из DOM (getBoundingClientRect) и пересчитываются при смене камеры, документа,
 * выделения, наведения и размера поля, поэтому толщина рамок и размер бейджей от зума не зависят.
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { LayoutDocument, LayoutNode, NodeId } from '@shared'
import type { Rect } from './camera'
import { useCameraStore } from './camera-store'
import { useDragStore } from './dnd/drag-store'
import { useFocusModeStore } from './focus-mode-store'
import { useLayoutStore } from './layout-store'
import { useViewSettingsStore } from './view-settings-store'
import { clientRectOf, findNodeElement } from './node-dom'
import { useNodeScroll } from './use-node-scroll'
import {
  ancestorIds,
  hoverBadgeText,
  isBadgeInside,
  overlayRectStyle,
  selectionBadgeText,
  sizeText,
  toLocalRect,
  visibleHoverId,
} from './selection'
import { findNode } from './tree-query'

/** Рамка оверлея для шаблона: классы, стиль положения, текст и классы бейджа. */
export interface SelectionBox {
  /** Фокус (затемнение вокруг, 16.7), контур предка наведённого блока (16.7), наведение, выделение. */
  kind: 'focus' | 'ancestor' | 'selected' | 'hover'
  /** Ключ отрисовки: вид и id блока (контуров предков несколько). */
  key: string
  classes: string[]
  style: Record<string, string>
  badge: string
  badgeClasses: string[]
}

/** Возвращает ref элемента оверлея и список рамок для отрисовки. */
export function useCanvasSelection() {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const viewSettings = useViewSettingsStore()
  const { document: doc, selectedId, hoveredId } = storeToRefs(layoutStore)
  const { camera, rootHeights } = storeToRefs(cameraStore)
  const dragStore = useDragStore()
  const focusMode = useFocusModeStore()
  /** Элемент оверлея: его положение на странице — начало экранных координат. */
  const overlayEl = ref<HTMLElement | null>(null)
  /** Рамки для отрисовки: наведение, затем выделение. */
  const boxes = ref<SelectionBox[]>([])
  let resizeObserver: ResizeObserver | null = null
  let frame: number | null = null

  /** Текст бейджа рамки: у выделения — подпись, тип и размер, у наведения — размер (у мелкого — с подписью), у остальных — нет. */
  function badgeText(kind: SelectionBox['kind'], node: LayoutNode, rect: Rect, size: string): string {
    if (kind === 'selected') return selectionBadgeText(node, size, layoutStore.rootLabels)
    if (kind === 'hover') return hoverBadgeText(node, rect, size, layoutStore.rootLabels, viewSettings.labelsVisible)
    return ''
  }

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
      key: `${kind}:${id}`,
      classes: ['canvas-selection__box', `canvas-selection__box--${kind}`],
      style: overlayRectStyle(rect),
      badge: badgeText(kind, node, rect, size),
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
    // Во время перетаскивания узла рамки скрыты: сплошная рамка выделения закрыла бы пунктирный след блока на месте.
    // При перемещении корня за заголовок рамка едет вместе с ним (пересчёт по сессии ниже).
    if (origin === undefined || dragStore.draggingId !== null) {
      boxes.value = []
      return
    }
    const hover = visibleHoverId(hoveredId.value, selectedId.value)
    // Порядок — снизу вверх: затемнение фокуса, контуры предков наведённого, наведение, выделение
    const entries: [SelectionBox['kind'], NodeId | null][] = [
      ['focus', focusMode.focusId],
      ...ancestorIds(doc.value, hoveredId.value).map((id): [SelectionBox['kind'], NodeId] => ['ancestor', id]),
      ['hover', hover],
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
  // Перетаскивание: начало и конец (рамки скрыть/вернуть) и новая точка перемещаемого корня (рамка едет за ним).
  // Живое зеркало меняет размеры связей без смены документа.
  watch(
    [
      camera,
      doc,
      selectedId,
      hoveredId,
      rootHeights,
      () => dragStore.draggingId,
      () => dragStore.rootPosition,
      () => viewSettings.linksMirrored,
      () => viewSettings.labelsVisible,
      () => focusMode.focusId,
    ],
    recompute,
    { flush: 'post' },
  )

  // Прокрутка области блока сдвигает выделенного или наведённого ребёнка
  useNodeScroll(recompute)

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
