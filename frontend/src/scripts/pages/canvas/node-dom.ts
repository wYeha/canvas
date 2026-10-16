/**
 * Работа с DOM блоков на канвасе: цель клика по `data-node-id`, заголовок корня, строка «Слоёв» под курсором,
 * элемент и цепочка узлов под точкой (поиск приёмника при перетаскивании),
 * измерение прямоугольников узлов и прокрутка строки в видимую часть панели.
 * DOM трогаем только здесь (правила: прямая работа с DOM — в scripts/).
 * Оверлеи поверх поля (призрак, выделение, будущие линия вставки и рамка приёмника) обязаны иметь
 * `pointer-events: none`: иначе `elementAtPoint` попадёт в них, а не в блок под курсором.
 */
import type { Rect } from './camera'
import type { CanvasPoint } from './factories'
import {
  LABEL_NODE_ATTR,
  LABEL_NODE_SELECTOR,
  LAYER_ID_ATTR,
  LAYER_SELECTOR,
  NODE_ID_ATTR,
  NODE_SELECTOR,
  ROOT_HANDLE_ATTR,
  ROOT_HANDLE_SELECTOR,
  WORLD_SELECTOR,
} from './constants'
import { rectContains, toWorldRect } from './selection'

/** Id ближайшего помеченного узла от цели события (самый глубокий блок под курсором); `null`, если цель вне блоков. */
export function nodeIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  return target.closest(NODE_SELECTOR)?.getAttribute(NODE_ID_ATTR) ?? null
}

/** Id корня, за заголовок которого взялись (`data-root-handle-id`); `null`, если цель не в заголовке корня. */
export function rootHandleIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  return target.closest(ROOT_HANDLE_SELECTOR)?.getAttribute(ROOT_HANDLE_ATTR) ?? null
}

/**
 * Верхний элемент, принимающий указатель, в точке страницы. Под захватом указателя цель событий — viewport,
 * поэтому элемент под курсором ищется явно. В окружении без `elementFromPoint` (тесты) — `null`.
 */
export function elementAtPoint(client: CanvasPoint): Element | null {
  if (typeof document.elementFromPoint !== 'function') return null
  return document.elementFromPoint(client.x, client.y)
}

/**
 * Id помеченных узлов от элемента вверх по DOM: самый глубокий первым, корень последним.
 * Заголовок корня лежит вне элемента блока — для него цепочка `[rootId]`; вне блоков — `[]`.
 */
export function nodeChainFromTarget(target: EventTarget | null): string[] {
  if (!(target instanceof Element)) return []
  const chain: string[] = []
  let el = target.closest(NODE_SELECTOR)
  while (el !== null) {
    const id = el.getAttribute(NODE_ID_ATTR)
    if (id !== null) chain.push(id)
    el = el.parentElement?.closest(NODE_SELECTOR) ?? null
  }
  if (chain.length > 0) return chain
  const rootId = rootHandleIdFromTarget(target)
  return rootId === null ? [] : [rootId]
}

/** Id узла строки панели «Слои» под курсором (`data-layer-id`); `null`, если цель вне строк. */
export function layerIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  return target.closest(LAYER_SELECTOR)?.getAttribute(LAYER_ID_ATTR) ?? null
}

/**
 * Id блока, по подписи которого пришёлся клик в точке `point` (координаты страницы); `null` — мимо подписей.
 * Заголовок корня ловит указатель сам. Чип и подпись листа прозрачны для указателя (клик проходит в блок),
 * поэтому у блока под курсором проверяется, попала ли точка в прямоугольник его подписи.
 */
export function labelNodeIdAt(target: EventTarget | null, point: CanvasPoint): string | null {
  if (!(target instanceof Element)) return null
  const header = target.closest(LABEL_NODE_SELECTOR)
  if (header !== null) return header.getAttribute(LABEL_NODE_ATTR)
  const node = target.closest(NODE_SELECTOR)
  const label = node === null ? undefined : Array.from(node.children).find((el) => el.hasAttribute(LABEL_NODE_ATTR))
  if (label === undefined || !rectContains(clientRectOf(label), point)) return null
  return label.getAttribute(LABEL_NODE_ATTR)
}

/** Фокусирует первое поле ввода внутри контейнера и выделяет его текст целиком (переименование в строке). */
export function focusInputIn(container: Element | null): void {
  const input = container?.querySelector('input')
  input?.focus()
  input?.select()
}

/** Прокручивает ближайший прокручиваемый контейнер так, чтобы элемент был виден (если его не видно). */
export function scrollIntoViewIfHidden(el: Element): void {
  // В jsdom метода нет: тесты компонентов не должны падать на прокрутке
  if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' })
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
