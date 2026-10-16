/**
 * Composable фрагмента CanvasLayersDropLine: линия вставки при перетаскивании в «Слоях» (только before/after).
 */
import { computed, type ComputedRef, type Ref } from 'vue'
import { LAYER_ID_ATTR } from './constants'
import { layerDropLineRect, layersDropAllowed } from './layers-drop'
import { layerDropLineStyle } from './layers-drop-style'
import { isLayersDragging, layersDraggingId, layersDropOver } from './layers-drag-state'
import { useLayoutStore } from './layout-store'
import { toLocalRect } from './selection'
import { getPath } from './tree-query'

/** Вид линии вставки для шаблона. */
export interface LayersDropLineView {
  classes: string[]
  style: Record<string, string>
}

/** Возвращает ref оверлея и вид линии (`null` — не показывать). */
export function useCanvasLayersDropLine(overlayEl: Ref<HTMLElement | null>): {
  view: ComputedRef<LayersDropLineView | null>
} {
  const layoutStore = useLayoutStore()

  /** Прямоугольник строки-якоря на странице. */
  function rowClientRect(overId: string): DOMRect | null {
    const row = document.querySelector(`[${LAYER_ID_ATTR}="${overId}"]`)
    return row?.getBoundingClientRect() ?? null
  }

  const view = computed<LayersDropLineView | null>(() => {
    const over = layersDropOver.value
    const dragged = layersDraggingId.value
    const origin = overlayEl.value?.getBoundingClientRect()
    if (
      !isLayersDragging.value ||
      over === null ||
      dragged === null ||
      origin === undefined ||
      (over.zone !== 'before' && over.zone !== 'after')
    ) {
      return null
    }
    if (!layersDropAllowed(layoutStore.document, dragged, over.overId, over.zone)) return null
    const rowRect = rowClientRect(over.overId)
    if (rowRect === null) return null
    const depth = getPath(layoutStore.document, over.overId).length - 1
    const client = layerDropLineRect(
      { x: rowRect.x, y: rowRect.y, width: rowRect.width, height: rowRect.height },
      over.zone,
      depth,
    )
    const local = toLocalRect(client, origin)
    return {
      classes: ['canvas-layers-drop-line', 'canvas-layers-drop-line--horizontal'],
      style: layerDropLineStyle(local),
    }
  })

  return { view }
}
