/**
 * Composable панорамирования канваса мышью: пробел + ЛКМ или средняя кнопка. Держит pointer capture,
 * сбрасывает состояние при потере фокуса окна, чтобы пробел и тяга не «залипали».
 */
import { onBeforeUnmount, onMounted, readonly, ref, type Ref } from 'vue'
import { useCameraStore } from './camera-store'
import { shouldCaptureSpace, type InteractiveLike } from './camera-input'
import { MIDDLE_BUTTON, PRIMARY_BUTTON, SPACE_CODE } from './constants'

/** Подключает панорамирование к viewport; `isSurface` решает, принадлежит ли цель события полю. */
export function useCanvasPan(viewportEl: Ref<HTMLElement | null>, isSurface: (target: EventTarget | null) => boolean) {
  const cameraStore = useCameraStore()
  /** Пробел зажат: ЛКМ начнёт тягу. */
  const spaceHeld = ref(false)
  /** Идёт тяга поля. */
  const panning = ref(false)
  let pointerId: number | null = null
  let lastX = 0
  let lastY = 0

  /** Сужает цель клавиатурного события до полей, нужных `shouldCaptureSpace`. */
  function keyTarget(e: KeyboardEvent): InteractiveLike {
    const t = e.target
    if (!(t instanceof HTMLElement)) return null
    return { tagName: t.tagName, isContentEditable: t.isContentEditable, role: t.getAttribute('role') }
  }

  /** Пробел вниз вне интерактивных элементов: блокирует скролл страницы и взводит пан. */
  function onKeyDown(e: KeyboardEvent): void {
    if (!shouldCaptureSpace(e, keyTarget(e))) return
    e.preventDefault()
    if (!e.repeat) spaceHeld.value = true
  }

  /** Пробел вверх: снимает готовность; уже идущая тяга продолжается до отпускания мыши. */
  function onKeyUp(e: KeyboardEvent): void {
    if (e.code !== SPACE_CODE) return
    spaceHeld.value = false
    if (shouldCaptureSpace(e, keyTarget(e))) e.preventDefault()
  }

  /** Начинает тягу средней кнопкой или пробел + ЛКМ на поверхности поля. */
  function onPointerDown(e: PointerEvent): void {
    const el = viewportEl.value
    if (el === null || panning.value || !isSurface(e.target)) return
    const allowed = e.button === MIDDLE_BUTTON || (e.button === PRIMARY_BUTTON && spaceHeld.value)
    if (!allowed) return
    // Для средней кнопки preventDefault не зовём: он подавил бы совместимый mousedown, где гасится автоскролл.
    if (e.button === PRIMARY_BUTTON) e.preventDefault()
    el.setPointerCapture(e.pointerId)
    pointerId = e.pointerId
    lastX = e.clientX
    lastY = e.clientY
    panning.value = true
  }

  /** Средняя кнопка на поле: гасит автоскролл Windows (mousedown) и действие по умолчанию (auxclick). */
  function onMiddleButton(e: MouseEvent): void {
    if (e.button === MIDDLE_BUTTON && isSurface(e.target)) e.preventDefault()
  }

  /** Двигает поле вслед за указателем. */
  function onPointerMove(e: PointerEvent): void {
    if (!panning.value || e.pointerId !== pointerId) return
    cameraStore.panBy(e.clientX - lastX, e.clientY - lastY)
    lastX = e.clientX
    lastY = e.clientY
  }

  /** Завершает тягу: снимает capture, если он ещё держится, и сбрасывает состояние. */
  function endPan(): void {
    const el = viewportEl.value
    const id = pointerId
    pointerId = null
    panning.value = false
    if (el !== null && id !== null && el.hasPointerCapture(id)) el.releasePointerCapture(id)
  }

  /** Завершает тягу только для нашего указателя. */
  function onPointerEnd(e: PointerEvent): void {
    if (e.pointerId === pointerId) endPan()
  }

  /** Полный сброс при уходе со страницы (Alt+Tab, смена вкладки). */
  function resetAll(): void {
    endPan()
    spaceHeld.value = false
  }

  /** Сброс, когда вкладка скрыта. */
  function onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') resetAll()
  }

  /** Подписывает обработчики окна, документа и viewport. */
  function subscribe(): void {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', resetAll)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const el = viewportEl.value
    if (el === null) return
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('mousedown', onMiddleButton)
    el.addEventListener('auxclick', onMiddleButton)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerEnd)
    el.addEventListener('pointercancel', onPointerEnd)
    el.addEventListener('lostpointercapture', onPointerEnd)
  }

  /** Снимает все обработчики и сбрасывает состояние. */
  function unsubscribe(): void {
    resetAll()
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', resetAll)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    const el = viewportEl.value
    if (el === null) return
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('mousedown', onMiddleButton)
    el.removeEventListener('auxclick', onMiddleButton)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerEnd)
    el.removeEventListener('pointercancel', onPointerEnd)
    el.removeEventListener('lostpointercapture', onPointerEnd)
  }

  onMounted(subscribe)
  onBeforeUnmount(unsubscribe)

  return { spaceHeld: readonly(spaceHeld), panning: readonly(panning) }
}
