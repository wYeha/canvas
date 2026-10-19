/**
 * Composable фрагмента CanvasLayersDragGhost: компактная карточка перетаскиваемой строки за курсором.
 */
import { computed, type ComputedRef, type Ref } from 'vue'
import { layerDragGhostStyle } from './layers-drop-style'
import { layerCaption, layerIcon, type LayerIcon } from './layers'
import {
  isLayersDragging,
  layersDraggingId,
  layersDropDenied,
  layersGhostSize,
  layersGrabOffset,
  layersPointer,
} from './layers-drag-state'
import { useLayoutStore } from './layout-store'
import { findNode } from './tree-query'
import { nodeTypeLabel } from './selection'
import { toLocalRect } from './selection'

/** Вид призрака строки для шаблона. */
export interface LayersDragGhostView {
  classes: string[]
  icon: LayerIcon
  caption: string
  type: string
  style: Record<string, string>
}

/** Возвращает вид призрака (`null` — не тянут). */
export function useCanvasLayersDragGhost(overlayEl: Ref<HTMLElement | null>): {
  ghost: ComputedRef<LayersDragGhostView | null>
} {
  const layoutStore = useLayoutStore()

  const ghost = computed<LayersDragGhostView | null>(() => {
    const id = layersDraggingId.value
    const origin = overlayEl.value?.getBoundingClientRect()
    if (!isLayersDragging.value || id === null || origin === undefined) return null
    const node = findNode(layoutStore.document, id)
    if (node === undefined) return null
    const { width, height } = layersGhostSize.value
    const { x: gx, y: gy } = layersGrabOffset.value
    const { x: px, y: py } = layersPointer.value
    const client = { x: px - gx, y: py - gy, width, height }
    const local = toLocalRect(client, origin)
    const classes = ['canvas-layers-drag-ghost']
    if (layersDropDenied.value) classes.push('canvas-layers-drag-ghost--denied')
    return {
      classes,
      icon: layerIcon(node),
      caption: layerCaption(node, layoutStore.rootLabels),
      type: nodeTypeLabel(node),
      style: layerDragGhostStyle(local),
    }
  })

  return { ghost }
}
