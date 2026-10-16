/**
 * Расчёт сдвига камеры при перетаскивании у края видимой области поля: линейная шкала от внутренней
 * границы полосы `margin` (скорость 0) до внешнего края `area` (скорость `maxSpeed`).
 */
import type { Rect } from '@/scripts/pages/canvas/camera'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'

/** Сдвиг камеры за кадр, экранные px; ноль — автопан не нужен. */
export interface AutopanDelta {
  dx: number
  dy: number
}

/** Доля полосы от 0 (внутренний край) до 1 (внешний край области). */
function edgeFactor(distance: number, margin: number): number {
  if (margin <= 0) return distance > 0 ? 1 : 0
  return Math.min(1, Math.max(0, distance / margin))
}

/**
 * Считает сдвиг по осям для точки `client` (экранные координаты страницы) относительно прямоугольника `area`
 * в тех же координатах.
 */
export function dragAutopanDelta(client: CanvasPoint, area: Rect, margin: number, maxSpeed: number): AutopanDelta {
  if (area.width <= 0 || area.height <= 0 || maxSpeed <= 0) return { dx: 0, dy: 0 }
  const left = area.x
  const right = area.x + area.width
  const top = area.y
  const bottom = area.y + area.height
  const innerLeft = left + margin
  const innerRight = right - margin
  const innerTop = top + margin
  const innerBottom = bottom - margin

  let dx = 0
  if (client.x < innerLeft) dx = -maxSpeed * edgeFactor(innerLeft - client.x, margin)
  else if (client.x > innerRight) dx = maxSpeed * edgeFactor(client.x - innerRight, margin)

  let dy = 0
  if (client.y < innerTop) dy = -maxSpeed * edgeFactor(innerTop - client.y, margin)
  else if (client.y > innerBottom) dy = maxSpeed * edgeFactor(client.y - innerBottom, margin)

  return { dx, dy }
}
