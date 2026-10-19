/** Composable фрагмента CanvasLinkDraft: линия протягиваемой связи от порта корня-источника к курсору (экран viewport). */
import { computed, type ComputedRef } from 'vue'
import { worldToScreen } from './camera'
import { useCameraStore } from './camera-store'
import { screenSegment } from './dnd/dnd-geometry'
import { linkDraftLineStyle } from './dnd/dnd-style'
import { useDragStore } from './dnd/drag-store'

/** Возвращает стиль линии; `null` — связь не тянут. */
export function useCanvasLinkDraft(): { style: ComputedRef<Record<string, string> | null> } {
  const dragStore = useDragStore()
  const cameraStore = useCameraStore()

  // Начало хранится на поле: при пане и зуме во время жеста линия остаётся у порта
  const style = computed(() => {
    const session = dragStore.session
    if (session?.kind !== 'link') return null
    const from = worldToScreen(cameraStore.camera, session.from)
    return linkDraftLineStyle(screenSegment(from, session.pointer))
  })

  return { style }
}
