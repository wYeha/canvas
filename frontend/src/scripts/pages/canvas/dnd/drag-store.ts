/**
 * Pinia-хранилище перетаскивания на канвасе: что тянут (узел или корень за заголовок), точка захвата, положение указателя
 * и приёмник под курсором. Его читают узлы (след на месте), корни (предпросмотр новой точки), призрак,
 * viewport (курсор, в том числе «нельзя»), оверлей выделения и хоткеи (блокировка на время перетаскивания).
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { NodeId } from '@shared'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'
import { rootDragPosition, type DragGrab } from './dnd-geometry'
import { sameDropTarget, type DropTarget } from './drop-target'

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

  /**
   * Приёмник под курсором для перетаскиваемого узла (у блока — с позицией вставки `index`); `null` — некуда
   * или нельзя. Без точки отпускания: она меняется на каждое движение и будила бы всех читателей; точку считают
   * при отпускании. Объект меняется только при смене блока или позиции вставки в нём.
   */
  const dropTarget = ref<DropTarget | null>(null)

  /** Тянут узел, а отпустить некуда: курсор «нельзя». Булев — меняется только на границах. */
  const dropDenied = computed<boolean>(() => session.value?.kind === 'node' && dropTarget.value === null)

  /** Начинает перетаскивание (предыдущее, если было, заменяется); приёмник сбрасывается. */
  function begin(next: DragSession): void {
    session.value = { ...next, pointer: { ...next.pointer } }
    dropTarget.value = null
  }

  /** Запоминает приёмник, только если он изменился: движение в одном блоке без смены позиции вставки стор не трогает. */
  function setDropTarget(next: DropTarget | null): void {
    if (!sameDropTarget(dropTarget.value, next)) dropTarget.value = next
  }

  /** Обновляет положение указателя; без перетаскивания ничего не делает. */
  function movePointer(pointer: CanvasPoint): void {
    if (session.value === null) return
    session.value = { ...session.value, pointer: { x: pointer.x, y: pointer.y } }
  }

  /** Завершает перетаскивание (и отпусканием, и отменой). */
  function end(): void {
    session.value = null
    dropTarget.value = null
  }

  return {
    session,
    draggingId,
    movingRootId,
    isDragging,
    rootPosition,
    dropTarget,
    dropDenied,
    begin,
    movePointer,
    setDropTarget,
    end,
  }
})
