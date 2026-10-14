/**
 * Работа с DOM блоков на канвасе: цель клика по `data-node-id` и измерение прямоугольников узлов.
 * DOM трогаем только здесь (правила: прямая работа с DOM — в scripts/).
 */
import type { Rect } from './camera'
import { NODE_ID_ATTR, NODE_SELECTOR, WORLD_SELECTOR } from './constants'
import { toWorldRect } from './selection'

/** Id ближайшего помеченного узла от цели события (самый глубокий блок под курсором); `null`, если цель вне блоков. */
export function nodeIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  return target.closest(NODE_SELECTOR)?.getAttribute(NODE_ID_ATTR) ?? null
}

/** Находит элемент узла по id внутри слоя мира; `null`, если он не отрисован. */
export function findNodeElement(id: string): Element | null {
  return document.querySelector(WORLD_SELECTOR)?.querySelector(`[${NODE_ID_ATTR}="${CSS.escape(id)}"]`) ?? null
}

/** Прямоугольник элемента в координатах страницы. */
export function clientRectOf(el: Element): Rect {
  const r = el.getBoundingClientRect()
  return { x: r.left, y: r.top, width: r.width, height: r.height }
}

/** Прямоугольник узла в координатах поля (`getBoundingClientRect` минус начало слоя мира, делённое на зум). */
export function measureNodeWorldRect(id: string, zoom: number): Rect | null {
  const el = findNodeElement(id)
  const world = document.querySelector(WORLD_SELECTOR)
  if (el === null || world === null) return null
  const origin = clientRectOf(world)
  return toWorldRect(clientRectOf(el), { x: origin.x, y: origin.y }, zoom)
}
