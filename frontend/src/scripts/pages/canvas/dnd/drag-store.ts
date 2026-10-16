/**
 * Pinia-хранилище перетаскивания на канвасе: что тянут (узел или корень за заголовок), точка захвата и положение указателя.
 * Его читают узлы (след на месте), корни (предпросмотр новой точки), призрак, viewport (курсор), оверлей выделения
 * и хоткеи (блокировка на время перетаскивания).
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { NodeId } from '@shared'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'
import { rootDragPosition, type DragGrab } from './dnd-geometry'

/** Перетаскивание узла: захват в координатах поля, указатель в экранных координатах viewport. */
export interface NodeDragSession {
  kind: 'node'
  nodeId: NodeId
  grab: DragGrab
  pointer: CanvasPoint
}

/** Перемещение корня по полю за заголовок: смещение точки нажатия от угла корня (поле), указатель (экран). */
export interface RootDragSession {
  kind: 'root'
  nodeId: NodeId
  offset: CanvasPoint
  pointer: CanvasPoint
}

/** Идущее перетаскивание. */
export type DragSession = NodeDragSession | RootDragSession

export const useDragStore = defineStore('drag', () => {
  const cameraStore = useCameraStore()
  /** Текущее перетаскивание; `null` — ничего не тянут. */
  const session = ref<DragSession | null>(null)

  /** Id перетаскиваемого узла (не корня за заголовок); меняется только в начале и в конце жеста. */
  const draggingId = computed<NodeId | null>(() => (session.value?.kind === 'node' ? session.value.nodeId : null))

  /** Id корня, который двигают по полю за заголовок. */
  const movingRootId = computed<NodeId | null>(() => (session.value?.kind === 'root' ? session.value.nodeId : null))

  /** Идёт ли перетаскивание любого вида. */
  const isDragging = computed<boolean>(() => session.value !== null)

  /** Новая точка перемещаемого корня на поле (предпросмотр до отпускания); `null`, если корень не двигают. */
  const rootPosition = computed<CanvasPoint | null>(() => {
    const current = session.value
    if (current?.kind !== 'root') return null
    return rootDragPosition(current.offset, current.pointer, cameraStore.camera)
  })

  /** Начинает перетаскивание (предыдущее, если было, заменяется). */
  function begin(next: DragSession): void {
    session.value = { ...next, pointer: { ...next.pointer } }
  }

  /** Обновляет положение указателя; без перетаскивания ничего не делает. */
  function movePointer(pointer: CanvasPoint): void {
    if (session.value === null) return
    session.value = { ...session.value, pointer: { x: pointer.x, y: pointer.y } }
  }

  /** Завершает перетаскивание (и отпусканием, и отменой). */
  function end(): void {
    session.value = null
  }

  return { session, draggingId, movingRootId, isDragging, rootPosition, begin, movePointer, end }
})
