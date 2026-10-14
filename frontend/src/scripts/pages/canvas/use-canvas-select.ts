/**
 * Composable выделения мышью: клик по блоку выделяет самый глубокий блок под курсором, клик по пустому полю
 * снимает выделение, движение указателя подсвечивает блок. Клик, завершивший пан или со сдвигом больше порога, не считается.
 */
import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import { CLICK_DRAG_THRESHOLD, PRIMARY_BUTTON } from './constants'
import type { CanvasPoint } from './factories'
import { useLayoutStore } from './layout-store'
import { nodeIdFromTarget } from './node-dom'
import { isClickGesture, resolveClickTarget } from './selection'

/** Подключает выделение к viewport; `isPanning` сообщает, что пробел зажат или идёт тяга поля. */
export function useCanvasSelect(
  viewportEl: Ref<HTMLElement | null>,
  isSurface: (target: EventTarget | null) => boolean,
  isPanning: () => boolean,
): void {
  const layoutStore = useLayoutStore()
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
  }

  /** Подсвечивает блок под курсором; во время тяги поля и над панелями подсветки нет. */
  function onPointerMove(e: PointerEvent): void {
    if (isPanning()) return
    layoutStore.hover(isSurface(e.target) ? nodeIdFromTarget(e.target) : null)
  }

  /** Сбрасывает ожидание клика (отмена жеста). */
  function onPointerCancel(): void {
    press = null
  }

  /** Убирает подсветку, когда указатель ушёл с поля. */
  function onPointerLeave(): void {
    layoutStore.hover(null)
  }

  onMounted(() => {
    const el = viewportEl.value
    if (el === null) return
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerleave', onPointerLeave)
  })

  onBeforeUnmount(() => {
    const el = viewportEl.value
    if (el === null) return
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerCancel)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerleave', onPointerLeave)
    layoutStore.hover(null)
  })
}
