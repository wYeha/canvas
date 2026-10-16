/**
 * Composable выделения мышью: клик по блоку выделяет самый глубокий блок под курсором, клик по пустому полю
 * снимает выделение, движение указателя подсвечивает блок (и над строками панели «Слои»).
 * Клик, завершивший пан или со сдвигом больше порога, не считается. Двойной клик по подписи блока — переименование.
 */
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import { CLICK_DRAG_THRESHOLD, PRIMARY_BUTTON } from './constants'
import type { CanvasPoint } from './factories'
import { useDragStore } from './dnd/drag-store'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'
import { labelNodeIdAt, layerIdFromTarget, nodeIdFromTarget } from './node-dom'
import { findNode } from './tree-query'
import { isClickGesture, resolveClickTarget } from './selection'

/** Подключает выделение к viewport; `isPanning` сообщает, что пробел зажат или идёт тяга поля. */
export function useCanvasSelect(
  viewportEl: Ref<HTMLElement | null>,
  isSurface: (target: EventTarget | null) => boolean,
  isPanning: () => boolean,
): void {
  const layoutStore = useLayoutStore()
  const labelEdit = useLabelEditStore()
  const dragStore = useDragStore()
  /** Указатель и точка нажатия, которое может стать кликом; `null` — клика не ждём. */
  let press: { pointerId: number; point: CanvasPoint } | null = null

  /** Запоминает нажатие ЛКМ на поле, если оно не начало пан (пробел) и пришло не с панели. */
  function onPointerDown(e: PointerEvent): void {
    const eligible = e.button === PRIMARY_BUTTON && isSurface(e.target) && !isPanning()
    press = eligible ? { pointerId: e.pointerId, point: { x: e.clientX, y: e.clientY } } : null
  }

  /** Завершает клик: выделяет узел под курсором или снимает выделение; сдвиг дальше порога — перетаскивание. */
  function onPointerUp(e: PointerEvent): void {
    const start = press
    press = null
    if (start === null || start.pointerId !== e.pointerId || isPanning()) return
    if (!isClickGesture(start.point, { x: e.clientX, y: e.clientY }, CLICK_DRAG_THRESHOLD)) return
    layoutStore.select(resolveClickTarget(layoutStore.document, nodeIdFromTarget(e.target)))
    // Выбор на канвасе: F2 теперь открывает поле у блока, а не в «Слоях»
    labelEdit.pickInLayers(null)
  }

  /** Двойной клик по подписи блока (заголовок корня, чип, подпись листа) открывает переименование на канвасе. */
  function onDoubleClick(e: MouseEvent): void {
    if (e.button !== PRIMARY_BUTTON || !isSurface(e.target) || isPanning()) return
    const id = labelNodeIdAt(e.target, { x: e.clientX, y: e.clientY })
    const node = id === null ? undefined : findNode(layoutStore.document, id)
    if (node?.type !== 'block') return
    layoutStore.select(node.id)
    labelEdit.beginRename(node.id, node.label, 'canvas')
  }

  /**
   * Подсвечивает блок под курсором: на поле — блок, над строкой «Слоёв» — её блок, над остальными панелями ничего.
   * Ховер строк обрабатывается здесь же, а не в самой строке: иначе этот обработчик сразу снимал бы подсветку.
   */
  function onPointerMove(e: PointerEvent): void {
    // Во время перетаскивания указатель захвачен полем: цель события — viewport, ховер по ней был бы ложным
    if (isPanning() || dragStore.isDragging) return
    layoutStore.hover(isSurface(e.target) ? nodeIdFromTarget(e.target) : layerIdFromTarget(e.target))
  }

  /** Сбрасывает ожидание клика (отмена жеста). */
  function onPointerCancel(): void {
    press = null
  }

  /** Убирает подсветку, когда указатель ушёл с поля. */
  function onPointerLeave(): void {
    layoutStore.hover(null)
  }

  // Нажатие, ставшее перетаскиванием, кликом уже не будет, даже если указатель вернётся к точке нажатия
  // или перетаскивание отменят по Esc
  watch(
    () => dragStore.isDragging,
    (dragging) => {
      if (dragging) press = null
    },
    { flush: 'sync' },
  )

  onMounted(() => {
    const el = viewportEl.value
    if (el === null) return
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerleave', onPointerLeave)
    el.addEventListener('dblclick', onDoubleClick)
  })

  onBeforeUnmount(() => {
    const el = viewportEl.value
    if (el === null) return
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerCancel)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerleave', onPointerLeave)
    el.removeEventListener('dblclick', onDoubleClick)
    layoutStore.hover(null)
  })
}
