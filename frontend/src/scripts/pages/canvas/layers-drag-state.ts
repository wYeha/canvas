/**
 * Состояние перетаскивания в панели «Слои» (без Pinia): читают хоткеи, строки и оверлеи; пишет `use-canvas-layers-dnd`.
 */
import { ref, type Ref } from 'vue'
import type { NodeId } from '@shared'
import type { LayerDropZone } from './layers-drop'

/** Точка отпускания над строкой. */
export interface LayerDropOver {
  overId: NodeId
  zone: LayerDropZone
}

/** Идёт ли жест перетаскивания в «Слоях». */
export const isLayersDragging: Ref<boolean> = ref(false)

/** Id перетаскиваемой строки. */
export const layersDraggingId: Ref<NodeId | null> = ref(null)

/** Строка и зона под курсором; `null` — вне списка. */
export const layersDropOver: Ref<LayerDropOver | null> = ref(null)

/** Есть жест, но текущий `layersDropOver` не даёт цели переноса. */
export const layersDropDenied: Ref<boolean> = ref(false)

/** Координаты указателя (client) для призрака. */
export const layersPointer: Ref<{ x: number; y: number }> = ref({ x: 0, y: 0 })

/** Размер строки при старте жеста (client px). */
export const layersGhostSize: Ref<{ width: number; height: number }> = ref({ width: 0, height: 0 })

/** Смещение точки захвата от левого верхнего угла строки. */
export const layersGrabOffset: Ref<{ x: number; y: number }> = ref({ x: 0, y: 0 })

/** После drag клик по строке не должен вызывать `activate`. */
export const layersSuppressClick: Ref<boolean> = ref(false)

/** Сбрасывает все поля сессии перетаскивания в «Слоях». */
export function resetLayersDragState(): void {
  isLayersDragging.value = false
  layersDraggingId.value = null
  layersDropOver.value = null
  layersDropDenied.value = false
  layersPointer.value = { x: 0, y: 0 }
  layersGhostSize.value = { width: 0, height: 0 }
  layersGrabOffset.value = { x: 0, y: 0 }
}

/**
 * Снимает флаг подавления клика после drag; `true`, если клик нужно пропустить.
 */
export function consumeLayersSuppressClick(): boolean {
  if (!layersSuppressClick.value) return false
  layersSuppressClick.value = false
  return true
}
