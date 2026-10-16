/**
 * Чистый расчёт позиции вставки в grid-блок при перетаскивании: ближайший ребёнок по прямоугольникам
 * и место до/после него слева направо (поток по строкам, как CSS `grid-auto-flow: row` по умолчанию).
 * Без Vue, Pinia и DOM; координаты — в одной системе (client у интеграции).
 */

import type { Rect } from '@/scripts/pages/canvas/camera'
import type { CanvasPoint } from '@/scripts/pages/canvas/factories'

/** Вход расчёта позиции вставки в grid-контейнер; координаты — в одной системе (client у интеграции). */
export interface GridInsertInput {
  /** Прямоугольники детей в порядке документа; `null` — не отрисован. */
  rects: readonly (Rect | null)[]
  pointer: CanvasPoint
  /** Индекс перетаскиваемого ребёнка в этом контейнере; `null` — узел из другого места. */
  skip: number | null
}

/** Квадрат расстояния от точки до прямоугольника (0, если точка внутри). */
function distanceSqToRect(point: CanvasPoint, rect: Rect): number {
  const left = rect.x
  const right = rect.x + rect.width
  const top = rect.y
  const bottom = rect.y + rect.height
  const dx = point.x < left ? left - point.x : point.x > right ? point.x - right : 0
  const dy = point.y < top ? top - point.y : point.y > bottom ? point.y - bottom : 0
  return dx * dx + dy * dy
}

/**
 * DOM-индекс ближайшего ребёнка среди кандидатов; при равном расстоянии — меньший индекс.
 * Кандидаты: `rects[i] !== null` и `i !== skip`.
 */
function nearestChild(rects: readonly (Rect | null)[], pointer: CanvasPoint, skip: number | null): number | null {
  let bestIndex: number | null = null
  let bestDist = Infinity
  for (let i = 0; i < rects.length; i += 1) {
    if (i === skip) continue
    const rect = rects[i]
    if (rect == null) continue
    const dist = distanceSqToRect(pointer, rect)
    if (dist < bestDist || (dist === bestDist && i < (bestIndex ?? Infinity))) {
      bestDist = dist
      bestIndex = i
    }
  }
  return bestIndex
}

/**
 * Индекс вставки до или после ребёнка `index` по оси потока (X): левее середины — до, иначе после.
 * Ровно на середине — «после» (строгое сравнение).
 */
function indexBeforeAfter(rects: readonly (Rect | null)[], index: number, pointer: CanvasPoint): number {
  const rect = rects[index]
  if (rect == null) return index + 1
  const mid = rect.x + rect.width / 2
  return pointer.x < mid ? index : index + 1
}

/**
 * Позиция вставки `0..rects.length` в порядке детей документа:
 * ближайший ребёнок (без `skip`), затем до/после по оси X (поток по строкам).
 * Нет кандидатов — `rects.length` (пустой контейнер — 0; единственный ребёнок — `skip` — 1).
 */
export function gridInsertIndex(input: GridInsertInput): number {
  const nearest = nearestChild(input.rects, input.pointer, input.skip)
  if (nearest === null) return input.rects.length
  return indexBeforeAfter(input.rects, nearest, input.pointer)
}
