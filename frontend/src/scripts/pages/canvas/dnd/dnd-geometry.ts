/**
 * Чистая геометрия перетаскивания на канвасе: порог старта, перевод точек страницы в координаты viewport,
 * точка захвата узла, экранный прямоугольник призрака и новая точка перемещаемого корня с учётом камеры. Без Vue и DOM.
 */
import { screenToWorld, type Camera, type Rect, type Size } from '@/scripts/pages/canvas/camera'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'

/**
 * Захват узла в начале перетаскивания, в координатах поля: смещение точки захвата от левого верхнего угла
 * узла и размер узла. В координатах поля, а не экрана — чтобы зум во время перетаскивания пересчитывал призрак.
 */
export interface DragGrab {
  offset: CanvasPoint
  size: Size
}

/** `true`, если указатель ушёл от точки нажатия дальше порога: нажатие стало перетаскиванием. */
export function isDragStart(start: CanvasPoint, current: CanvasPoint, threshold: number): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) > threshold
}

/** Переводит точку страницы (`clientX/Y`) в локальные координаты viewport, начало которого — `origin`. */
export function toViewportPoint(client: CanvasPoint, origin: CanvasPoint): CanvasPoint {
  return { x: client.x - origin.x, y: client.y - origin.y }
}

/** Ограничивает значение отрезком `[0, max]`. */
function clampToSize(value: number, max: number): number {
  return Math.min(Math.max(value, 0), Math.max(max, 0))
}

/**
 * Захват узла: точка указателя и прямоугольник узла — оба в координатах поля. Смещение зажимается в пределы узла:
 * из-за округлений замера указатель на самой границе мог бы оказаться чуть снаружи.
 */
export function createGrab(pointerWorld: CanvasPoint, nodeRect: Rect): DragGrab {
  return {
    offset: {
      x: clampToSize(pointerWorld.x - nodeRect.x, nodeRect.width),
      y: clampToSize(pointerWorld.y - nodeRect.y, nodeRect.height),
    },
    size: { width: nodeRect.width, height: nodeRect.height },
  }
}

/**
 * Коэффициент уменьшения призрака: 1, если экранный размер узла помещается в `max`, иначе пропорционально меньше.
 * Нулевой размер (пустой узел до замера) считается за 1px, чтобы не делить на 0.
 */
export function ghostScale(screen: Size, max: Size): number {
  return Math.min(1, max.width / Math.max(screen.width, 1), max.height / Math.max(screen.height, 1))
}

/**
 * Смещение точки нажатия от левого верхнего угла корня, в координатах поля. Не зажимается: корень тянут
 * за заголовок над блоком, поэтому `y` обычно отрицательный.
 */
export function rootGrabOffset(pressWorld: CanvasPoint, rootAt: CanvasPoint): CanvasPoint {
  return { x: pressWorld.x - rootAt.x, y: pressWorld.y - rootAt.y }
}

/**
 * Новая точка корня на поле: под указателем `pointer` (экранные координаты viewport) остаётся точка захвата.
 * Считается от указателя, а не суммой сдвигов, поэтому пан и зум во время перетаскивания не сбивают захват.
 * Округляется до целых px поля, чтобы координаты в документе оставались читаемыми.
 */
export function rootDragPosition(offset: CanvasPoint, pointer: CanvasPoint, camera: Camera): CanvasPoint {
  const world = screenToWorld(camera, pointer)
  return { x: Math.round(world.x - offset.x), y: Math.round(world.y - offset.y) }
}

/**
 * Экранный прямоугольник призрака в координатах viewport. Размер — размер узла на экране при текущем зуме,
 * уменьшенный до `max`; точка захвата (с тем же уменьшением) остаётся под указателем `pointer`.
 */
export function ghostRect(grab: DragGrab, pointer: CanvasPoint, zoom: number, max: Size): Rect {
  const screen = { width: grab.size.width * zoom, height: grab.size.height * zoom }
  const k = ghostScale(screen, max)
  return {
    x: pointer.x - grab.offset.x * zoom * k,
    y: pointer.y - grab.offset.y * zoom * k,
    width: screen.width * k,
    height: screen.height * k,
  }
}
