/**
 * Чистая логика выделения: клик или перетаскивание, цель клика, навигация Esc/Enter по документу,
 * прямоугольники оверлея и поля, текст бейджа и плашки пути. Без Vue и DOM.
 */
import type { LayoutDocument, LayoutNode, NodeId } from '@shared'
import type { Rect } from './camera'
import {
  BADGE_SEPARATOR,
  CSS_PX_UNIT,
  LINK_TYPE_LABEL,
  ROOT_UNTITLED_LABEL,
  SELECTION_BADGE_OFFSET,
  SIZE_SEPARATOR,
} from './constants'
import type { CanvasPoint } from './factories'
import { blockLabel, linkCaption } from './node-view'
import { findNode, findParent } from './tree-query'

/** Сегмент плашки пути: id узла и текст кнопки. */
export interface BreadcrumbSegment {
  id: NodeId
  text: string
}

/** `true`, если указатель сдвинулся не дальше порога: это клик, а не перетаскивание. */
export function isClickGesture(start: CanvasPoint, end: CanvasPoint, threshold: number): boolean {
  return Math.hypot(end.x - start.x, end.y - start.y) <= threshold
}

/** Цель клика: id найденного под курсором узла, если он есть в документе; иначе `null` (снять выделение). */
export function resolveClickTarget(doc: LayoutDocument, id: string | null): NodeId | null {
  return id !== null && findNode(doc, id) !== undefined ? id : null
}

/** Esc: родитель выделенного узла; у корня и без выделения — `null` (снять выделение). */
export function parentSelection(doc: LayoutDocument, id: NodeId | null): NodeId | null {
  if (id === null) return null
  return findParent(doc, id)?.id ?? null
}

/** Enter: первый ребёнок выделенного блока; у листа и у плашки связи выделение не меняется. */
export function firstChildSelection(doc: LayoutDocument, id: NodeId | null): NodeId | null {
  if (id === null) return null
  const node = findNode(doc, id)
  if (node?.type !== 'block') return id
  return node.children[0]?.id ?? id
}

/** Id для подсветки наведения: поверх выделенного узла наведение не показываем. */
export function visibleHoverId(hoveredId: NodeId | null, selectedId: NodeId | null): NodeId | null {
  return hoveredId !== null && hoveredId === selectedId ? null : hoveredId
}

/** Тип узла для бейджа: `flex` / `grid` у блока, `связь` у плашки. */
export function nodeTypeLabel(node: LayoutNode): string {
  return node.type === 'link' ? LINK_TYPE_LABEL : node.container.kind
}

/** Подпись узла: подпись блока (или заглушка без подписи) либо текст плашки связи. */
export function nodeCaption(doc: LayoutDocument, node: LayoutNode): string {
  if (node.type === 'link') return linkCaption(doc, node.sourceId)
  const label = blockLabel(node)
  return label === '' ? ROOT_UNTITLED_LABEL : label
}

/** Размер `Ш×В` в px поля: экранные размеры делятся на зум и округляются. */
export function sizeText(rect: Rect, zoom: number): string {
  return `${String(Math.round(rect.width / zoom))}${SIZE_SEPARATOR}${String(Math.round(rect.height / zoom))}`
}

/** Текст бейджа выделения: `подпись · тип · Ш×В`. */
export function selectionBadgeText(doc: LayoutDocument, node: LayoutNode, size: string): string {
  return [nodeCaption(doc, node), nodeTypeLabel(node), size].join(BADGE_SEPARATOR)
}

/** Переводит экранный прямоугольник страницы в локальный прямоугольник оверлея (минус его начало). */
export function toLocalRect(client: Rect, origin: Rect): Rect {
  return { x: client.x - origin.x, y: client.y - origin.y, width: client.width, height: client.height }
}

/** Переводит экранный прямоугольник страницы в координаты поля: `worldOrigin` — положение начала поля на странице. */
export function toWorldRect(client: Rect, worldOrigin: CanvasPoint, zoom: number): Rect {
  return {
    x: (client.x - worldOrigin.x) / zoom,
    y: (client.y - worldOrigin.y) / zoom,
    width: client.width / zoom,
    height: client.height / zoom,
  }
}

/** `true`, если над блоком нет места для бейджа и его нужно положить внутрь блока. */
export function isBadgeInside(rect: Rect): boolean {
  return rect.y < SELECTION_BADGE_OFFSET
}

/** Динамический стиль рамки оверлея: положение и размер в экранных px. */
export function overlayRectStyle(rect: Rect): Record<string, string> {
  return {
    left: `${String(rect.x)}${CSS_PX_UNIT}`,
    top: `${String(rect.y)}${CSS_PX_UNIT}`,
    width: `${String(rect.width)}${CSS_PX_UNIT}`,
    height: `${String(rect.height)}${CSS_PX_UNIT}`,
  }
}

/** Сегменты плашки пути по цепочке узлов от корня до выделенного. */
export function breadcrumbSegments(doc: LayoutDocument, path: readonly LayoutNode[]): BreadcrumbSegment[] {
  return path.map((node) => ({ id: node.id, text: nodeCaption(doc, node) }))
}
