/**
 * Composable фрагмента CanvasDragGhost: призрак перетаскиваемого блока за курсором — подпись, значок и цвет по глубине,
 * экранный прямоугольник по указателю и текущему зуму камеры.
 */
import { computed } from 'vue'
import { useCameraStore } from './camera-store'
import { DRAG_GHOST_MAX_SIZE } from './constants'
import { ghostRect } from './dnd/dnd-geometry'
import { dragGhostStyle } from './dnd/dnd-style'
import { useDragStore } from './dnd/drag-store'
import { useLayoutStore } from './layout-store'
import { directionIcon, paletteIndex } from './node-view'
import { nodeCaption } from './selection'
import { findNode, getPath } from './tree-query'

/** Содержимое призрака: классы, значок и подпись. */
export interface DragGhostView {
  classes: string[]
  icon: string
  text: string
}

/** Возвращает вид призрака (`null` — ничего не тянут) и его динамический стиль. */
export function useCanvasDragGhost() {
  const dragStore = useDragStore()
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()

  /** Содержимое призрака: зависит от узла и документа, но не от движения мыши. */
  const ghost = computed<DragGhostView | null>(() => {
    const id = dragStore.draggingId
    const doc = layoutStore.document
    const node = id === null ? undefined : findNode(doc, id)
    if (node === undefined) return null
    const text = nodeCaption(doc, node)
    if (node.type === 'link') return { classes: ['canvas-drag-ghost', 'canvas-drag-ghost--link'], icon: '', text }
    const depth = getPath(doc, node.id).length - 1
    const classes = ['canvas-drag-ghost', `canvas-drag-ghost--depth-${String(paletteIndex(depth))}`]
    return { classes, icon: directionIcon(node), text }
  })

  /** Положение и размер призрака: пересчитываются при движении указателя и при зуме во время перетаскивания. */
  const style = computed<Record<string, string>>(() => {
    const session = dragStore.session
    if (session?.kind !== 'node') return {}
    return dragGhostStyle(ghostRect(session.grab, session.pointer, cameraStore.camera.zoom, DRAG_GHOST_MAX_SIZE))
  })

  return { ghost, style }
}
