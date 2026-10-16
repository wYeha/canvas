/**
 * Чистая геометрия перетаскивания на канвасе: порог старта, перевод точек страницы в координаты viewport,
 * точка захвата узла и экранный прямоугольник призрака с учётом зума камеры. Без Vue и DOM.
 */
import type { Rect, Size } from '@/scripts/pages/canvas/camera'
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
