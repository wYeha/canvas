/**
 * Чистая геометрия камеры канваса: перевод экран ↔ поле, панорамирование, зум к точке, ступени зума,
 * вписывание прямоугольника и габариты корней. Экранные точки — локальные координаты viewport.
 */
import type { NodeId, RootEntry } from '@shared'
import type { CanvasPoint } from './factories'
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP_EPSILON, ZOOM_STEPS } from './constants'

/**
 * Камера: `x, y` — положение начала поля (0,0) в экранных px относительно левого верхнего угла viewport,
 * `zoom` — множитель (1 = 100%). `screen = world * zoom + (x, y)`, что совпадает с CSS
 * `translate(x, y) scale(zoom)` при `transform-origin: 0 0`.
 */
export interface Camera {
  x: number
  y: number
  zoom: number
}

/** Размер области, px. */
export interface Size {
  width: number
  height: number
}

/** Прямоугольник: левый верхний угол и размер. */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Вставки от краёв области, px. */
export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

/** Ограничивает зум диапазоном `[ZOOM_MIN, ZOOM_MAX]`; не конечное значение даёт 1. */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
}

/** Переводит точку поля в экранные координаты viewport. */
export function worldToScreen(camera: Camera, point: CanvasPoint): CanvasPoint {
  return { x: point.x * camera.zoom + camera.x, y: point.y * camera.zoom + camera.y }
}

/** Переводит экранную точку viewport в координаты поля. */
export function screenToWorld(camera: Camera, point: CanvasPoint): CanvasPoint {
  return { x: (point.x - camera.x) / camera.zoom, y: (point.y - camera.y) / camera.zoom }
}

/** Сдвигает камеру на `dx, dy` экранных px; без сдвига возвращает ту же камеру. */
export function panBy(camera: Camera, dx: number, dy: number): Camera {
  if (dx === 0 && dy === 0) return camera
  return { ...camera, x: camera.x + dx, y: camera.y + dy }
}

/** Меняет зум так, что точка поля под экранным `anchor` остаётся на месте; без изменения зума — та же камера. */
export function zoomAt(camera: Camera, anchor: CanvasPoint, nextZoom: number): Camera {
  const zoom = clampZoom(nextZoom)
  if (zoom === camera.zoom) return camera
  // Точка поля под анкером до зума; после зума она должна снова попасть в anchor:
  // anchor = world * zoom + offset  =>  offset = anchor - world * zoom.
  const world = screenToWorld(camera, anchor)
  return { x: anchor.x - world.x * zoom, y: anchor.y - world.y * zoom, zoom }
}

/** Следующая ступень шкалы зума выше текущего значения; за верхом шкалы — `ZOOM_MAX`. */
export function nextZoomStep(zoom: number): number {
  return ZOOM_STEPS.find((step) => step > zoom + ZOOM_STEP_EPSILON) ?? ZOOM_MAX
}

/** Предыдущая ступень шкалы зума ниже текущего значения; за низом шкалы — `ZOOM_MIN`. */
export function prevZoomStep(zoom: number): number {
  return [...ZOOM_STEPS].reverse().find((step) => step < zoom - ZOOM_STEP_EPSILON) ?? ZOOM_MIN
}

/** Центр прямоугольной области. */
export function areaCenter(area: Rect): CanvasPoint {
  return { x: area.x + area.width / 2, y: area.y + area.height / 2 }
}

/** Видимая область viewport без вставок панелей; если она вырождается — весь viewport. */
export function safeArea(viewport: Size, insets: Insets): Rect {
  const width = viewport.width - insets.left - insets.right
  const height = viewport.height - insets.top - insets.bottom
  if (width <= 0 || height <= 0) return { x: 0, y: 0, width: viewport.width, height: viewport.height }
  return { x: insets.left, y: insets.top, width, height }
}

/**
 * Камера, при которой прямоугольник поля `rect` целиком виден в экранной области `area` с отступом `padding`
 * и центрирован в ней; зум не больше `maxZoom`. `null`, если после отступа места не осталось.
 */
export function fitRect(rect: Rect, area: Rect, padding: number, maxZoom: number): Camera | null {
  const availWidth = area.width - padding * 2
  const availHeight = area.height - padding * 2
  if (availWidth <= 0 || availHeight <= 0) return null
  // max(…, 1): корень с неизвестной высотой 0 — «полоса», деление на 0 исключено.
  const zoom = clampZoom(
    Math.min(availWidth / Math.max(rect.width, 1), availHeight / Math.max(rect.height, 1), maxZoom),
  )
  const target = areaCenter(area)
  const center = areaCenter(rect)
  return { x: target.x - center.x * zoom, y: target.y - center.y * zoom, zoom }
}

/**
 * Габариты всех корней на поле. Высота корня — явная `canvas.height`, иначе замер из `heights`, иначе 0.
 * Пустой список — `null`.
 */
export function rootsBounds(roots: readonly RootEntry[], heights: ReadonlyMap<NodeId, number>): Rect | null {
  if (roots.length === 0) return null
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const root of roots) {
    const rect = rootRect(root, heights)
    left = Math.min(left, rect.x)
    top = Math.min(top, rect.y)
    right = Math.max(right, rect.x + rect.width)
    bottom = Math.max(bottom, rect.y + rect.height)
  }
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** Прямоугольник корня на поле. Высота — явная `canvas.height`, иначе замер из `heights`, иначе 0. */
export function rootRect(root: RootEntry, heights: ReadonlyMap<NodeId, number>): Rect {
  const { canvas, node } = root
  return { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height ?? heights.get(node.id) ?? 0 }
}

/**
 * Смещение камеры по одной оси: отрезок поля `[start, start + size]` при зуме `zoom` встаёт по центру экранного
 * отрезка `[areaStart, areaStart + areaSize]`; если с отступами не помещается — прижимается к его началу.
 */
function centerAxis(
  start: number,
  size: number,
  areaStart: number,
  areaSize: number,
  zoom: number,
  padding: number,
): number {
  const screenSize = size * zoom
  const offset = screenSize <= areaSize - padding * 2 ? (areaSize - screenSize) / 2 : padding
  return areaStart + offset - start * zoom
}

/**
 * Камера с тем же зумом, при которой прямоугольник поля `rect` стоит по центру экранной области `area`.
 * Большой прямоугольник не центрируется по своей оси, а показывается с начала (левый или верхний край с отступом).
 */
export function centerOn(camera: Camera, rect: Rect, area: Rect, padding: number): Camera {
  const { zoom } = camera
  return {
    x: centerAxis(rect.x, rect.width, area.x, area.width, zoom, padding),
    y: centerAxis(rect.y, rect.height, area.y, area.height, zoom, padding),
    zoom,
  }
}

/** Подпись зума в процентах: 1 → `'100%'`. */
export function formatZoom(zoom: number): string {
  return `${String(Math.round(zoom * 100))}%`
}
