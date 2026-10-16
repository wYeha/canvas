/**
 * Pinia-хранилище перетаскивания на канвасе: какой узел тянут, точка захвата и положение указателя.
 * Его читают узлы (след на месте), призрак, viewport (курсор) и хоткеи (блокировка на время перетаскивания).
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { NodeId } from '@shared'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'
import type { DragGrab } from './dnd-geometry'

/** Идущее перетаскивание: узел, захват в координатах поля, указатель в экранных координатах viewport. */
export interface DragSession {
  nodeId: NodeId
  grab: DragGrab
  pointer: CanvasPoint
}

export const useDragStore = defineStore('drag', () => {
  /** Текущее перетаскивание; `null` — ничего не тянут. */
  const session = ref<DragSession | null>(null)

  /** Id перетаскиваемого узла (меняется только в начале и в конце, а не на каждое движение мыши). */
  const draggingId = computed<NodeId | null>(() => session.value?.nodeId ?? null)

  /** Идёт ли перетаскивание. */
  const isDragging = computed<boolean>(() => session.value !== null)

  /** Начинает перетаскивание (предыдущее, если было, заменяется). */
  function begin(next: DragSession): void {
    session.value = { nodeId: next.nodeId, grab: next.grab, pointer: { ...next.pointer } }
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

  return { session, draggingId, isDragging, begin, movePointer, end }
})
