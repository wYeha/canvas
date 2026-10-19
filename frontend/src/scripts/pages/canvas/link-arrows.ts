/** Чистая геометрия стрелок связей на поле: отрезок от границы источника до границы плашки. Без Vue и DOM. */
import type { Rect } from './camera'
import type { CanvasPoint } from './factories'

/** Отрезок стрелки в координатах поля: от источника (`x1`, `y1`) к плашке (`x2`, `y2`). */
export interface ArrowSegment {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** Центр прямоугольника. */
function center(rect: Rect): CanvasPoint {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

/** Прямоугольники пересекаются или касаются (стрелку между ними не рисуем — она ушла бы внутрь). */
function intersects(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height
}

/** Точка выхода луча из центра прямоугольника в сторону `toward` через его границу. */
function exitPoint(rect: Rect, toward: CanvasPoint): CanvasPoint {
  const c = center(rect)
  const dx = toward.x - c.x
  const dy = toward.y - c.y
  const tx = dx === 0 ? Number.POSITIVE_INFINITY : rect.width / 2 / Math.abs(dx)
  const ty = dy === 0 ? Number.POSITIVE_INFINITY : rect.height / 2 / Math.abs(dy)
  const t = Math.min(tx, ty)
  return { x: c.x + dx * t, y: c.y + dy * t }
}

/**
 * Стрелка от источника к плашке: по линии между центрами, от границы одного до границы другого.
 * Пересекающиеся прямоугольники (плашка над источником, источник внутри цели при перетаскивании) — `null`.
 */
export function arrowSegment(source: Rect, target: Rect): ArrowSegment | null {
  if (intersects(source, target)) return null
  const from = exitPoint(source, center(target))
  const to = exitPoint(target, center(source))
  return { x1: from.x, y1: from.y, x2: to.x, y2: to.y }
}
