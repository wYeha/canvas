/**
 * Чистая логика областей прокрутки на канвасе (15.2): прокрутит ли колесо область по её оси или упрётся в край.
 * Колесо над областью прокручивает её, пока есть куда, а дальше двигает поле. Без DOM, Vue и Pinia.
 */
import type { ScrollAxis } from '@shared'
import { SCROLL_EDGE_EPSILON } from './constants'

/** Размеры и положение прокрутки элемента (как у DOM-элемента). */
export interface ScrollMetrics {
  scrollTop: number
  scrollHeight: number
  clientHeight: number
  scrollLeft: number
  scrollWidth: number
  clientWidth: number
}

/** Дельта колеса в пикселях прокрутки: вперёд (вниз/вправо) — положительная. */
export interface ScrollDelta {
  x: number
  y: number
}

/** Сдвинется ли область по оси `axis` от прокрутки на `delta`: есть содержимое за краем в эту сторону. */
export function canScrollBy(metrics: ScrollMetrics, axis: ScrollAxis, delta: ScrollDelta): boolean {
  const step = axis === 'y' ? delta.y : delta.x
  if (step === 0) return false
  const position = axis === 'y' ? metrics.scrollTop : metrics.scrollLeft
  const range = axis === 'y' ? metrics.scrollHeight - metrics.clientHeight : metrics.scrollWidth - metrics.clientWidth
  return step > 0 ? position < range - SCROLL_EDGE_EPSILON : position > SCROLL_EDGE_EPSILON
}
