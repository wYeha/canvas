/**
 * Работа с DOM блоков на канвасе: цель клика по `data-node-id`, заголовок и порт связи корня, строка «Слоёв» под курсором,
 * элемент и цепочка узлов под точкой (поиск приёмника при перетаскивании),
 * измерение прямоугольников узлов (в том числе прямых детей приёмника для позиции вставки)
 * и прокрутка строки в видимую часть панели.
 * DOM трогаем только здесь (правила: прямая работа с DOM — в scripts/).
 * Оверлеи поверх поля (призрак, выделение, линия вставки `CanvasDropInsert`, оверлей выделения) обязаны иметь
 * `pointer-events: none`: иначе `elementAtPoint` попадёт в них, а не в блок под курсором.
 * Подсветка приёмника — класс на `canvas-node`, не оверлей.
 * Копии повтора помечены `data-repeat-of` (id исходного блока) вместо `data-node-id`: клик, ховер, двойной клик
 * и начало перетаскивания по копии относятся к исходному блоку, а замеры, оверлей и поиск приёмника копий не видят.
 */
import type { Rect } from './camera'
import type { CanvasPoint } from './factories'
import {
  LABEL_NODE_ATTR,
  LABEL_NODE_SELECTOR,
  LAYER_ID_ATTR,
  LAYER_SELECTOR,
  LINK_PORT_ATTR,
  LINK_PORT_SELECTOR,
  NODE_ID_ATTR,
  NODE_OR_REPEAT_SELECTOR,
  NODE_SELECTOR,
  REPEAT_OF_ATTR,
  ROOT_HANDLE_ATTR,
  ROOT_HANDLE_SELECTOR,
  VIEWPORT_LABELS_HIDDEN_SELECTOR,
  WORLD_SELECTOR,
} from './constants'
import { rectContains, toWorldRect } from './selection'

/** Id блока по ближайшему помеченному элементу: свой id у блока, id исходного блока у копии повтора. */
function markedId(el: Element): string | null {
  return el.getAttribute(NODE_ID_ATTR) ?? el.getAttribute(REPEAT_OF_ATTR)
}

/**
 * Id ближайшего помеченного узла от цели события (самый глубокий блок под курсором); `null`, если цель вне блоков.
 * Копия повтора (и всё внутри неё) даёт id исходного блока с повтором.
 */
export function nodeIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  const el = target.closest(NODE_OR_REPEAT_SELECTOR)
  return el === null ? null : markedId(el)
}

/** Id корня, за порт связи которого взялись (`data-link-port-id`); `null`, если цель не порт. */
export function linkPortIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  return target.closest(LINK_PORT_SELECTOR)?.getAttribute(LINK_PORT_ATTR) ?? null
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
 * Копии повтора без `data-node-id` в цепочку не попадают: над копией (и её содержимым) первым идёт родитель
 * исходного блока — копия не приёмник для вставки «внутрь», вставка рядом считается по настоящим детям.
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
 * Скрытые подписи (поле с модификатором «подписи скрыты») не ловят двойной клик, в том числе по копии повтора;
 * заголовок корня остаётся. Двойной клик в любом месте копии повтора относится к исходному блоку
 * (у копий своих подписей для правки нет).
 */
export function labelNodeIdAt(target: EventTarget | null, point: CanvasPoint): string | null {
  if (!(target instanceof Element)) return null
  const header = target.closest(LABEL_NODE_SELECTOR)
  if (header !== null) return header.getAttribute(LABEL_NODE_ATTR)
  const node = target.closest(NODE_OR_REPEAT_SELECTOR)
  // Скрытые подписи проверяем раньше копии: иначе двойной клик по копии откроет переименование невидимой подписи
  if (node?.closest(VIEWPORT_LABELS_HIDDEN_SELECTOR) != null) return null
  if (node?.hasAttribute(REPEAT_OF_ATTR) === true) return node.getAttribute(REPEAT_OF_ATTR)
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

/**
 * Прямоугольники прямых детей блока `parentId` в координатах страницы, в порядке `childIds` из документа
 * (`null` — ребёнок не отрисован); `null` — нет элемента блока. Порядок берётся из документа, а не из DOM:
 * между сменой документа и перерисовкой они могут на кадр разойтись. Чип и подпись без `data-node-id` пропускаются.
 */
export function measureChildClientRects(parentId: string, childIds: readonly string[]): (Rect | null)[] | null {
  const parent = findNodeElement(parentId)
  if (parent === null) return null
  const byId = new Map<string, Element>()
  for (const el of Array.from(parent.children)) {
    const id = el.getAttribute(NODE_ID_ATTR)
    if (id !== null) byId.set(id, el)
  }
  return childIds.map((id) => {
    const el = byId.get(id)
    return el === undefined ? null : clientRectOf(el)
  })
}

/** Прямоугольник узла в координатах поля (`getBoundingClientRect` минус начало слоя мира, делённое на зум). */
export function measureNodeWorldRect(id: string, zoom: number): Rect | null {
  const el = findNodeElement(id)
  const world = document.querySelector(WORLD_SELECTOR)
  if (el === null || world === null) return null
  const origin = clientRectOf(world)
  return toWorldRect(clientRectOf(el), { x: origin.x, y: origin.y }, zoom)
}
