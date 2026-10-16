/**
 * Composable перетаскивания строк в панели «Слои»: pointer events на списке, порог 4px, отмена Esc,
 * перенос через `layoutStore.moveNode`. Состояние — в `layers-drag-state.ts`, не в `drag-store`.
 */
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import type { NodeId } from '@shared'
import {
  CLICK_DRAG_THRESHOLD,
  ESCAPE_CODE,
  LAYER_ID_ATTR,
  LAYER_ITEM_EDIT_SELECTOR,
  LAYER_ITEM_TOGGLE_SELECTOR,
  LAYER_SELECTOR,
  PRIMARY_BUTTON,
  PRIMARY_BUTTON_MASK,
} from './constants'
import type { CanvasPoint } from './factories'
import { useDragStore } from './dnd/drag-store'
import { layerDropZone, layersDropAllowed, layersMoveTarget } from './layers-drop'
import {
  consumeLayersSuppressClick,
  isLayersDragging,
  layersDraggingId,
  layersDropDenied,
  layersDropOver,
  layersGhostSize,
  layersGrabOffset,
  layersPointer,
  layersSuppressClick,
  resetLayersDragState,
  type LayerDropOver,
} from './layers-drag-state'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'
import { clientRectOf, layerIdFromTarget } from './node-dom'
import { findNode } from './tree-query'
import { isDragStart } from './dnd/dnd-geometry'

/** Нажатие на строке до порога перетаскивания. */
interface PendingRowPress {
  pointerId: number
  nodeId: NodeId
  start: CanvasPoint
  rowEl: HTMLElement
}

/** Обновляет `dropDenied` по текущему `dropOver`. */
function refreshDropDenied(doc: ReturnType<typeof useLayoutStore>['document'], draggedId: NodeId): void {
  const over = layersDropOver.value
  layersDropDenied.value = over !== null && !layersDropAllowed(doc, draggedId, over.overId, over.zone)
}

/** Запоминает приёмник только при смене пары (id, зона). */
function setDropOver(
  next: LayerDropOver | null,
  doc: ReturnType<typeof useLayoutStore>['document'],
  draggedId: NodeId,
): void {
  const prev = layersDropOver.value
  if (prev?.overId === next?.overId && prev?.zone === next?.zone) return
  layersDropOver.value = next
  refreshDropDenied(doc, draggedId)
}

/** Ищет строку под курсором и зону по вертикали внутри неё. */
function hitRow(clientX: number, clientY: number): LayerDropOver | null {
  const el = document.elementFromPoint(clientX, clientY)
  const id = layerIdFromTarget(el)
  if (id === null) return null
  const row = el?.closest(LAYER_SELECTOR)
  if (!(row instanceof HTMLElement)) return null
  const rect = row.getBoundingClientRect()
  const zone = layerDropZone(clientY - rect.top, rect.height)
  return { overId: id, zone }
}

/** Подключает перетаскивание к списку «Слоёв». */
export function useCanvasLayersDnd(listEl: Ref<HTMLElement | null>): void {
  const layoutStore = useLayoutStore()
  const labelEdit = useLabelEditStore()
  const dragStore = useDragStore()
  let pending: PendingRowPress | null = null
  let activePointer: number | null = null

  /** Можно ли начать drag с этой цели. */
  function canStartFromTarget(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) return null
    if (target.closest(LAYER_ITEM_TOGGLE_SELECTOR) !== null) return null
    if (target.closest(LAYER_ITEM_EDIT_SELECTOR) !== null) return null
    const row = target.closest(LAYER_SELECTOR)
    if (!(row instanceof HTMLElement)) return null
    const id = row.getAttribute(LAYER_ID_ATTR)
    if (id === null) return null
    if (labelEdit.editingId === id && labelEdit.place === 'layers') return null
    return row
  }

  /** Начинает перетаскивание строки. */
  function start(press: PendingRowPress, e: PointerEvent): void {
    const el = listEl.value
    if (el === null) return
    labelEdit.finish()
    const rect = clientRectOf(press.rowEl)
    layersGrabOffset.value = { x: e.clientX - rect.x, y: e.clientY - rect.y }
    layersGhostSize.value = { width: rect.width, height: rect.height }
    layersDraggingId.value = press.nodeId
    isLayersDragging.value = true
    layersDropOver.value = null
    layersDropDenied.value = false
    layersPointer.value = { x: e.clientX, y: e.clientY }
    activePointer = e.pointerId
    el.setPointerCapture(e.pointerId)
    layoutStore.select(press.nodeId)
    labelEdit.pickInLayers(press.nodeId)
    window.getSelection()?.removeAllRanges()
  }

  /** Завершает жест и снимает захват. */
  function stop(): void {
    pending = null
    const el = listEl.value
    const id = activePointer
    activePointer = null
    resetLayersDragState()
    if (el !== null && id !== null && el.hasPointerCapture(id)) el.releasePointerCapture(id)
  }

  /** Нажатие ЛКМ на строке (не шеврон, не поле переименования). */
  function onPointerDown(e: PointerEvent): void {
    pending = null
    if (e.button !== PRIMARY_BUTTON || !e.isPrimary || dragStore.isDragging) return
    const row = canStartFromTarget(e.target)
    if (row === null) return
    const id = row.getAttribute(LAYER_ID_ATTR)
    if (id === null) return
    pending = {
      pointerId: e.pointerId,
      nodeId: id,
      start: { x: e.clientX, y: e.clientY },
      rowEl: row,
    }
  }

  /** Движение: порог, затем обновление приёмника. */
  function onPointerMove(e: PointerEvent): void {
    if (activePointer !== null) {
      if (e.pointerId !== activePointer) return
      layersPointer.value = { x: e.clientX, y: e.clientY }
      const dragged = layersDraggingId.value
      if (dragged === null) return
      setDropOver(hitRow(e.clientX, e.clientY), layoutStore.document, dragged)
      return
    }
    const press = pending
    if (press === null || press.pointerId !== e.pointerId) return
    if ((e.buttons & PRIMARY_BUTTON_MASK) === 0) {
      pending = null
      return
    }
    if (!isDragStart(press.start, { x: e.clientX, y: e.clientY }, CLICK_DRAG_THRESHOLD)) return
    pending = null
    start(press, e)
    const dragged = layersDraggingId.value
    if (dragged !== null) setDropOver(hitRow(e.clientX, e.clientY), layoutStore.document, dragged)
  }

  /** Отпускание: перенос или no-op; после drag клик не срабатывает. */
  function onPointerUp(e: PointerEvent): void {
    if (activePointer === null) {
      if (pending?.pointerId === e.pointerId) pending = null
      return
    }
    if (e.pointerId !== activePointer) return
    const dragged = layersDraggingId.value
    const over = layersDropOver.value
    const shouldSuppress = isLayersDragging.value
    const target =
      dragged !== null && over !== null ? layersMoveTarget(layoutStore.document, dragged, over.overId, over.zone) : null
    if (dragged !== null && target !== null && !layoutStore.moveNode(dragged, target)) {
      // no-op: «то же место» или документ изменился во время жеста
    }
    stop()
    if (shouldSuppress) layersSuppressClick.value = true
  }

  /** Отмена жеста. */
  function onPointerAbort(e: PointerEvent): void {
    if (e.pointerId === activePointer || e.pointerId === pending?.pointerId) stop()
  }

  /** Esc отменяет перетаскивание в «Слоях». */
  function onKeyDown(e: KeyboardEvent): void {
    if (!isLayersDragging.value || e.code !== ESCAPE_CODE) return
    e.preventDefault()
    e.stopPropagation()
    stop()
  }

  /** Скрытая вкладка — сброс жеста. */
  function onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') stop()
  }

  watch(
    () => layoutStore.document,
    (doc) => {
      const id = layersDraggingId.value
      if (id !== null && findNode(doc, id) === undefined) stop()
    },
  )

  /** Вешает обработчики на текущий список. */
  function bindList(el: HTMLElement): void {
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerAbort)
    el.addEventListener('lostpointercapture', onPointerAbort)
  }

  /** Снимает обработчики со списка. */
  function unbindList(el: HTMLElement): void {
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerAbort)
    el.removeEventListener('lostpointercapture', onPointerAbort)
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('blur', stop)
    document.addEventListener('visibilitychange', onVisibilityChange)
    if (listEl.value !== null) bindList(listEl.value)
  })

  watch(listEl, (el, prev) => {
    if (prev !== null) unbindList(prev)
    if (el !== null) bindList(el)
  })

  onBeforeUnmount(() => {
    stop()
    window.removeEventListener('keydown', onKeyDown, { capture: true })
    window.removeEventListener('blur', stop)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (listEl.value !== null) unbindList(listEl.value)
  })
}

/** Пропускает клик по строке сразу после перетаскивания. */
export function skipLayersClickAfterDrag(): boolean {
  return consumeLayersSuppressClick()
}
