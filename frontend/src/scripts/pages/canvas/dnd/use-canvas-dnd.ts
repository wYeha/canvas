/**
 * Composable перетаскивания на канвасе (pointer events, без библиотек): нажатие ЛКМ на блоке или на заголовке корня,
 * старт после порога, захват указателя, движение (призрак узла или предпросмотр корня), отпускание и отмена
 * (Esc, потеря захвата, уход со страницы). Корень за заголовок при отпускании переезжает в новую точку поля;
 * для узла ищется приёмник под курсором (`use-drop-target.ts`): над пустым полем узел становится корнем,
 * над блоком с индексом вставки — переносится внутрь (`child`). `Alt` при отпускании — копия в цель;
 * у края видимого поля — автопан (`drag-autopan.ts`). От порта корня протягивается новая связь: при отпускании над
 * допустимым блоком она встаёт в него на позицию вставки. За ручку на конце стрелки связь перепривязывают: при
 * отпускании она переезжает в блок под курсором.
 */
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import { isLinkBlock, type NodeId } from '@shared'
import { screenToWorld, type Rect } from '@/scripts/pages/canvas/camera'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import {
  CLICK_DRAG_THRESHOLD,
  DRAG_AUTOPAN_MARGIN_PX,
  DRAG_AUTOPAN_MAX_SPEED_PX,
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
  linkEndIdFromTarget,
  linkPortIdFromTarget,
  nodeIdFromTarget,
  rootHandleIdFromTarget,
} from '@/scripts/pages/canvas/node-dom'
import { findNode, findRootEntry } from '@/scripts/pages/canvas/tree-query'
import type { MoveTarget } from '@/scripts/pages/canvas/tree-types'
import { arrowSegment } from '@/scripts/pages/canvas/link-arrows'
import { dragAutopanDelta } from './drag-autopan'
import { createGrab, isDragStart, rootGrabOffset, toViewportPoint } from './dnd-geometry'
import { useDragStore, type DragSession } from './drag-store'
import { useDropTarget } from './use-drop-target'

/**
 * Нажатие ЛКМ на блоке (`node`), заголовке корня (`root`), порте связи или конце стрелки (`link`), которое ещё может
 * стать перетаскиванием. У конца стрелки `nodeId` — источник, `linkId` — перепривязываемая связь.
 */
interface PendingPress {
  kind: DragSession['kind']
  pointerId: number
  nodeId: NodeId
  linkId: NodeId | null
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
  const { refreshTarget, nodeDropMove, linkDrop } = useDropTarget(isSurface)
  /** Нажатие до порога; `null` — не ждём. */
  let pending: PendingPress | null = null
  /** Указатель идущего перетаскивания (захвачен viewport). */
  let activePointer: number | null = null
  /** Начало viewport на странице, замеренное в начале перетаскивания. */
  let origin: CanvasPoint = { x: 0, y: 0 }
  /** Последняя точка указателя на странице (для автопана). */
  let lastClient: CanvasPoint = { x: 0, y: 0 }
  /** Режим превью и отпускания: копия вместо переноса. */
  let dropForCopy = false
  /** Идущий кадр автопана; `null` — цикл остановлен. */
  let autopanRaf: number | null = null

  /** Видимая область поля в координатах страницы (как `clientX` / `clientY`). */
  function clientVisibleArea(): Rect {
    const el = viewportEl.value
    if (el === null) return { x: 0, y: 0, width: 0, height: 0 }
    const rect = clientRectOf(el)
    const area = cameraStore.visibleArea
    return { x: rect.x + area.x, y: rect.y + area.y, width: area.width, height: area.height }
  }

  /** Останавливает цикл автопана. */
  function stopAutopan(): void {
    if (autopanRaf === null) return
    cancelAnimationFrame(autopanRaf)
    autopanRaf = null
  }

  /** Один кадр автопана: сдвиг камеры и пересчёт приёмника по последней точке. */
  function autopanFrame(): void {
    autopanRaf = null
    if (activePointer === null) return
    const delta = dragAutopanDelta(lastClient, clientVisibleArea(), DRAG_AUTOPAN_MARGIN_PX, DRAG_AUTOPAN_MAX_SPEED_PX)
    if (delta.dx === 0 && delta.dy === 0) return
    cameraStore.panBy(delta.dx, delta.dy)
    refreshTarget(lastClient, { forCopy: dropForCopy })
    autopanRaf = requestAnimationFrame(autopanFrame)
  }

  /** Запускает автопан, если курсор в полосе у края видимого поля. */
  function scheduleAutopanIfNeeded(): void {
    if (activePointer === null || autopanRaf !== null) return
    const delta = dragAutopanDelta(lastClient, clientVisibleArea(), DRAG_AUTOPAN_MARGIN_PX, DRAG_AUTOPAN_MAX_SPEED_PX)
    if (delta.dx === 0 && delta.dy === 0) return
    autopanRaf = requestAnimationFrame(autopanFrame)
  }

  /** Запоминает нажатие основной кнопкой на блоке поля или на заголовке корня, если это не пан. */
  function onPointerDown(e: PointerEvent): void {
    pending = null
    if (e.button !== PRIMARY_BUTTON || !e.isPrimary || !isSurface(e.target) || isPanning()) return
    const start = { x: e.clientX, y: e.clientY }
    const relink = relinkPress(e, start)
    if (relink !== null) {
      pending = relink
      return
    }
    // Порт лежит в заголовке корня: проверяется раньше заголовка, иначе нажатие начало бы перемещение корня
    const portId = linkPortIdFromTarget(e.target)
    if (portId !== null) {
      pending = { kind: 'link', pointerId: e.pointerId, nodeId: portId, linkId: null, start }
      return
    }
    const nodeId = nodeIdFromTarget(e.target)
    if (nodeId !== null) {
      pending = { kind: 'node', pointerId: e.pointerId, nodeId, linkId: null, start }
      return
    }
    const rootId = rootHandleIdFromTarget(e.target)
    if (rootId !== null) pending = { kind: 'root', pointerId: e.pointerId, nodeId: rootId, linkId: null, start }
  }

  /** Нажатие на ручку конца стрелки: перепривязка связи к её же источнику; `null`, если цель не ручка или не связь. */
  function relinkPress(e: PointerEvent, start: CanvasPoint): PendingPress | null {
    const linkId = linkEndIdFromTarget(e.target)
    const link = linkId === null ? undefined : findNode(layoutStore.document, linkId)
    if (link === undefined || !isLinkBlock(link)) return null
    return { kind: 'link', pointerId: e.pointerId, nodeId: link.sourceId, linkId: link.id, start }
  }

  /** Начало линии перепривязки — начало стрелки у источника по замеру; не отрисовано — точка нажатия. */
  function relinkFrom(sourceId: NodeId, linkId: NodeId, pressWorld: CanvasPoint): CanvasPoint {
    const zoom = cameraStore.camera.zoom
    const source = measureNodeWorldRect(sourceId, zoom)
    const link = measureNodeWorldRect(linkId, zoom)
    const segment = source && link ? arrowSegment(source, link) : null
    return segment === null ? pressWorld : { x: segment.x1, y: segment.y1 }
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
   * Сессия протягивания связи: новая — линия от точки нажатия на порт, перепривязка — от начала стрелки (на поле);
   * `null`, если корня нет.
   */
  function linkSession(press: PendingPress, pressWorld: CanvasPoint, pointer: CanvasPoint): DragSession | null {
    if (findRootEntry(layoutStore.document, press.nodeId) === undefined) return null
    const { nodeId, linkId } = press
    const from = linkId === null ? pressWorld : relinkFrom(nodeId, linkId, pressWorld)
    return { kind: 'link', nodeId, linkId, from, pointer }
  }

  /** Сессия по виду нажатия. */
  function sessionFor(press: PendingPress, pressWorld: CanvasPoint, pointer: CanvasPoint): DragSession | null {
    if (press.kind === 'node') return nodeSession(press, pressWorld, pointer)
    if (press.kind === 'root') return rootSession(press, pressWorld, pointer)
    return linkSession(press, pressWorld, pointer)
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
    const session = sessionFor(press, pressWorld, pointer)
    if (session === null) return
    dragStore.begin(session)
    activePointer = e.pointerId
    el.setPointerCapture(e.pointerId)
    // Выделяем то, что тянем: свойства показывают перетаскиваемый блок, F2 — на канвасе (у новой связи — её источник)
    layoutStore.select(press.linkId ?? press.nodeId)
    labelEdit.pickInLayers(null)
    layoutStore.hover(null)
    window.getSelection()?.removeAllRanges()
    refreshTarget({ x: e.clientX, y: e.clientY })
  }

  /**
   * Двигает призрак за указателем; до порога — проверяет, не пора ли начать перетаскивание.
   * Приёмник ищется до сдвига призрака: Vue ещё не перерисовал поле, хит-тест не форсирует раскладку.
   */
  function onPointerMove(e: PointerEvent): void {
    if (activePointer !== null) {
      if (e.pointerId !== activePointer) return
      const client = { x: e.clientX, y: e.clientY }
      lastClient = client
      dropForCopy = e.altKey
      refreshTarget(client, { forCopy: e.altKey })
      dragStore.movePointer(toViewportPoint(client, origin))
      scheduleAutopanIfNeeded()
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
    stopAutopan()
    const el = viewportEl.value
    const id = activePointer
    activePointer = null
    dropForCopy = false
    dragStore.end()
    if (el !== null && id !== null && el.hasPointerCapture(id)) el.releasePointerCapture(id)
  }

  /**
   * Отпускание: перемещённый корень записывается в документ одним шагом истории (та же точка — без шага);
   * узел над пустым полем становится корнем; над блоком с индексом — перенос внутрь (`child`). Иначе no-op.
   * Приёмник пересчитывается по точке отпускания: она может отличаться от последнего `pointermove`.
   */
  function onPointerUp(e: PointerEvent): void {
    if (activePointer === null) {
      if (pending?.pointerId === e.pointerId) pending = null
      return
    }
    if (e.pointerId !== activePointer) return
    const client = { x: e.clientX, y: e.clientY }
    lastClient = client
    const forCopy = e.altKey
    dropForCopy = forCopy
    refreshTarget(client, { forCopy })
    const id = dragStore.session?.nodeId ?? null
    if (dragStore.session?.kind === 'link') {
      const linkId = dragStore.session.linkId
      const drop = linkDrop()
      stop()
      if (id === null || drop === null) return
      if (linkId === null) layoutStore.addLink(drop.parentId, id, drop.index)
      else layoutStore.moveNode(linkId, { type: 'child', parentId: drop.parentId, index: drop.index })
      return
    }
    const target = releaseMove(client)
    stop()
    if (id === null || target === null) return
    if (forCopy) layoutStore.copyNodeToTarget(id, target)
    else layoutStore.moveNode(id, target)
  }

  /** Цель переноса при отпускании в точке страницы: новая точка корня за заголовок или перенос узла на поле. */
  function releaseMove(client: CanvasPoint): MoveTarget | null {
    const at = dragStore.rootPosition
    if (at !== null) return { type: 'canvas', at }
    return nodeDropMove(toViewportPoint(client, origin))
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

  // Узел, корень или перепривязываемая связь пропали из документа во время перетаскивания — тянуть больше нечего
  watch(
    () => layoutStore.document,
    (doc) => {
      const session = dragStore.session
      if (session === null) return
      const linkId = session.kind === 'link' ? session.linkId : null
      const gone = findNode(doc, session.nodeId) === undefined
      if (gone || (linkId !== null && findNode(doc, linkId) === undefined)) stop()
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
