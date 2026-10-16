/**
 * Composable перетаскивания на канвасе (pointer events, без библиотек): нажатие ЛКМ на блоке или на заголовке корня,
 * старт после порога, захват указателя, движение (призрак узла или предпросмотр корня), отпускание и отмена
 * (Esc, потеря захвата, уход со страницы). Корень при отпускании переезжает в новую точку поля;
 * поиск приёмника и перенос узла — следующие итерации.
 */
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import type { NodeId } from '@shared'
import { screenToWorld } from '@/scripts/pages/canvas/camera'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import {
  CLICK_DRAG_THRESHOLD,
  ESCAPE_CODE,
  PRIMARY_BUTTON,
  PRIMARY_BUTTON_MASK,
} from '@/scripts/pages/canvas/constants'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'
import { useLabelEditStore } from '@/scripts/pages/canvas/label-edit-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import {
  clientRectOf,
  measureNodeWorldRect,
  nodeIdFromTarget,
  rootHandleIdFromTarget,
} from '@/scripts/pages/canvas/node-dom'
import { findNode, findRootEntry } from '@/scripts/pages/canvas/tree-query'
import { createGrab, isDragStart, rootGrabOffset, toViewportPoint } from './dnd-geometry'
import { useDragStore, type DragSession } from './drag-store'

/** Нажатие ЛКМ на блоке (`node`) или на заголовке корня (`root`), которое ещё может стать перетаскиванием. */
interface PendingPress {
  kind: DragSession['kind']
  pointerId: number
  nodeId: NodeId
  start: CanvasPoint
}

/** Подключает перетаскивание к viewport; `isPanning` сообщает, что пробел зажат или идёт тяга поля. */
export function useCanvasDnd(
  viewportEl: Ref<HTMLElement | null>,
  isSurface: (target: EventTarget | null) => boolean,
  isPanning: () => boolean,
): void {
  const dragStore = useDragStore()
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const labelEdit = useLabelEditStore()
  /** Нажатие до порога; `null` — не ждём. */
  let pending: PendingPress | null = null
  /** Указатель идущего перетаскивания (захвачен viewport). */
  let activePointer: number | null = null
  /** Начало viewport на странице, замеренное в начале перетаскивания. */
  let origin: CanvasPoint = { x: 0, y: 0 }

  /** Запоминает нажатие основной кнопкой на блоке поля или на заголовке корня, если это не пан. */
  function onPointerDown(e: PointerEvent): void {
    pending = null
    if (e.button !== PRIMARY_BUTTON || !e.isPrimary || !isSurface(e.target) || isPanning()) return
    const start = { x: e.clientX, y: e.clientY }
    const nodeId = nodeIdFromTarget(e.target)
    if (nodeId !== null) {
      pending = { kind: 'node', pointerId: e.pointerId, nodeId, start }
      return
    }
    const rootId = rootHandleIdFromTarget(e.target)
    if (rootId !== null) pending = { kind: 'root', pointerId: e.pointerId, nodeId: rootId, start }
  }

  /** Сессия перетаскивания узла: захват по замеру узла в DOM; `null`, если узел не отрисован. */
  function nodeSession(press: PendingPress, pressWorld: CanvasPoint, pointer: CanvasPoint): DragSession | null {
    const nodeRect = measureNodeWorldRect(press.nodeId, cameraStore.camera.zoom)
    if (nodeRect === null) return null
    return { kind: 'node', nodeId: press.nodeId, grab: createGrab(pressWorld, nodeRect), pointer }
  }

  /** Сессия перемещения корня: смещение точки нажатия от его угла на поле; `null`, если корня нет. */
  function rootSession(press: PendingPress, pressWorld: CanvasPoint, pointer: CanvasPoint): DragSession | null {
    const entry = findRootEntry(layoutStore.document, press.nodeId)
    if (entry === undefined) return null
    return { kind: 'root', nodeId: press.nodeId, offset: rootGrabOffset(pressWorld, entry.canvas), pointer }
  }

  /**
   * Начинает перетаскивание: захват считается от точки нажатия (а не от текущей, ушедшей на порог),
   * указатель захватывается только сейчас — иначе `pointerup` обычного клика пришёл бы во viewport и снял выделение.
   */
  function start(press: PendingPress, e: PointerEvent): void {
    const el = viewportEl.value
    if (el === null) return
    const rect = clientRectOf(el)
    origin = { x: rect.x, y: rect.y }
    const pressWorld = screenToWorld(cameraStore.camera, toViewportPoint(press.start, origin))
    const pointer = toViewportPoint({ x: e.clientX, y: e.clientY }, origin)
    const session =
      press.kind === 'node' ? nodeSession(press, pressWorld, pointer) : rootSession(press, pressWorld, pointer)
    if (session === null) return
    dragStore.begin(session)
    activePointer = e.pointerId
    el.setPointerCapture(e.pointerId)
    // Выделяем то, что тянем: свойства показывают перетаскиваемый блок, F2 — на канвасе
    layoutStore.select(press.nodeId)
    labelEdit.pickInLayers(null)
    layoutStore.hover(null)
    window.getSelection()?.removeAllRanges()
  }

  /** Двигает призрак за указателем; до порога — проверяет, не пора ли начать перетаскивание. */
  function onPointerMove(e: PointerEvent): void {
    if (activePointer !== null) {
      if (e.pointerId === activePointer) dragStore.movePointer(toViewportPoint({ x: e.clientX, y: e.clientY }, origin))
      return
    }
    const press = pending
    if (press === null || press.pointerId !== e.pointerId || isPanning()) return
    // Кнопку отпустили за пределами поля (pointerup до viewport не дошёл): нажатие устарело
    if ((e.buttons & PRIMARY_BUTTON_MASK) === 0) {
      pending = null
      return
    }
    if (!isDragStart(press.start, { x: e.clientX, y: e.clientY }, CLICK_DRAG_THRESHOLD)) return
    pending = null
    start(press, e)
  }

  /** Завершает перетаскивание (и отпускание, и отмена): снимает захват указателя и очищает состояние. */
  function stop(): void {
    pending = null
    const el = viewportEl.value
    const id = activePointer
    activePointer = null
    dragStore.end()
    if (el !== null && id !== null && el.hasPointerCapture(id)) el.releasePointerCapture(id)
  }

  /**
   * Отпускание: перемещённый корень записывается в документ одним шагом истории (та же точка — без шага);
   * перенос узла (приёмник и drop) — в следующих итерациях, сейчас просто завершаем.
   */
  function onPointerUp(e: PointerEvent): void {
    if (activePointer === null) {
      if (pending?.pointerId === e.pointerId) pending = null
      return
    }
    if (e.pointerId !== activePointer) return
    const rootId = dragStore.movingRootId
    const at = dragStore.rootPosition
    stop()
    if (rootId !== null && at !== null) layoutStore.moveNode(rootId, { type: 'canvas', at })
  }

  /** Отмена жеста браузером или потеря захвата указателя. */
  function onPointerAbort(e: PointerEvent): void {
    if (e.pointerId === activePointer || e.pointerId === pending?.pointerId) stop()
  }

  /** Esc во время перетаскивания отменяет его; перехват до хоткеев, чтобы Esc не поднял выделение к родителю. */
  function onKeyDown(e: KeyboardEvent): void {
    if (!dragStore.isDragging || e.code !== ESCAPE_CODE) return
    e.preventDefault()
    e.stopPropagation()
    stop()
  }

  /** Отмена, когда вкладка скрыта. */
  function onVisibilityChange(): void {
    if (document.visibilityState === 'hidden') stop()
  }

  // Узел или корень пропал из документа во время перетаскивания — тянуть больше нечего
  watch(
    () => layoutStore.document,
    (doc) => {
      const id = dragStore.session?.nodeId ?? null
      if (id !== null && findNode(doc, id) === undefined) stop()
    },
  )

  /** Подписывает обработчики viewport, окна и документа. */
  function subscribe(): void {
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('blur', stop)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const el = viewportEl.value
    if (el === null) return
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerAbort)
    el.addEventListener('lostpointercapture', onPointerAbort)
  }

  /** Снимает все обработчики и отменяет идущее перетаскивание. */
  function unsubscribe(): void {
    stop()
    window.removeEventListener('keydown', onKeyDown, { capture: true })
    window.removeEventListener('blur', stop)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    const el = viewportEl.value
    if (el === null) return
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('pointermove', onPointerMove)
    el.removeEventListener('pointerup', onPointerUp)
    el.removeEventListener('pointercancel', onPointerAbort)
    el.removeEventListener('lostpointercapture', onPointerAbort)
  }

  onMounted(subscribe)
  onBeforeUnmount(unsubscribe)
}
