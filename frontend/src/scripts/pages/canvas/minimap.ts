/**
 * Чистая геометрия мини-карты (16.8): корни и видимая область в координатах поля вписываются в рамку мини-карты с
 * сохранением пропорций; клик по мини-карте переводится обратно в точку поля. Без DOM и Vue.
 */
import type { Rect } from './camera'
import type { CanvasPoint } from './factories'
import { MINIMAP_PADDING } from './constants'

/** Размер рамки мини-карты, px. */
export interface MinimapSize {
  width: number
  height: number
}

/** Раскладка мини-карты: прямоугольники корней и видимой области в её пикселях, масштаб и сдвиг для обратного перевода. */
export interface MinimapLayout {
  roots: Rect[]
  view: Rect
  scale: number
  origin: CanvasPoint
}

/** Общая рамка прямоугольников (непустой список). */
function bounds(rects: readonly Rect[]): Rect {
  const left = Math.min(...rects.map((rect) => rect.x))
  const top = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** Переводит прямоугольник поля в пиксели мини-карты. */
function toMinimap(rect: Rect, scale: number, origin: CanvasPoint): Rect {
  return {
    x: (rect.x - origin.x) * scale,
    y: (rect.y - origin.y) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  }
}

/**
 * Вписывает корни и видимую область в мини-карту размером `size` с полями `MINIMAP_PADDING`: общая рамка всех
 * прямоугольников масштабируется целиком и центрируется.
 */
export function minimapLayout(roots: readonly Rect[], view: Rect, size: MinimapSize): MinimapLayout {
  const all = bounds([...roots, view])
  const inner = { width: size.width - 2 * MINIMAP_PADDING, height: size.height - 2 * MINIMAP_PADDING }
  const scale = Math.min(inner.width / Math.max(all.width, 1), inner.height / Math.max(all.height, 1))
  // Сдвиг так, чтобы рамка встала по центру мини-карты
  const origin = {
    x: all.x - (size.width / scale - all.width) / 2,
    y: all.y - (size.height / scale - all.height) / 2,
  }
  return {
    roots: roots.map((rect) => toMinimap(rect, scale, origin)),
    view: toMinimap(view, scale, origin),
    scale,
    origin,
  }
}

/** Точка поля под точкой мини-карты (клик — показать это место). */
export function minimapToWorld(layout: MinimapLayout, point: CanvasPoint): CanvasPoint {
  return { x: point.x / layout.scale + layout.origin.x, y: point.y / layout.scale + layout.origin.y }
}
