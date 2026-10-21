/**
 * Чистая логика выделения: клик или перетаскивание, цель клика, навигация Esc/Enter по документу,
 * прямоугольники оверлея и поля, текст бейджа и плашки пути. Без Vue и DOM.
 */
import { isLinkBlock, type LayoutDocument, type LayoutNode, type NodeId } from '@shared'
import type { Rect } from './camera'
import {
  BADGE_SEPARATOR,
  CSS_PX_UNIT,
  LABEL_MIN_SCREEN_WIDTH,
  LINK_ICON,
  LINK_TYPE_LABEL,
  ROOT_UNTITLED_LABEL,
  SELECTION_BADGE_OFFSET,
  SIZE_SEPARATOR,
} from './constants'
import type { CanvasPoint } from './factories'
import { blockLabel, linkSourceName, type SourceLabels } from './node-view'
import { findNode, findParent, getPath } from './tree-query'

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

/** Enter: первый ребёнок выделенного блока; у листа выделение не меняется. */
export function firstChildSelection(doc: LayoutDocument, id: NodeId | null): NodeId | null {
  if (id === null) return null
  return findNode(doc, id)?.children[0]?.id ?? id
}

/** Id для подсветки наведения: поверх выделенного узла наведение не показываем. */
export function visibleHoverId(hoveredId: NodeId | null, selectedId: NodeId | null): NodeId | null {
  return hoveredId !== null && hoveredId === selectedId ? null : hoveredId
}

/** Тип узла для бейджа и строки «Слоёв»: `связь` у связи, иначе вид контейнера блока, `flex` / `grid`. */
export function nodeTypeLabel(node: LayoutNode): string {
  return isLinkBlock(node) ? LINK_TYPE_LABEL : node.container.kind
}

/** Подпись узла: у связи — `→ Имя источника`, у блока — подпись или заглушка без подписи. */
export function nodeCaption(node: LayoutNode, labels: SourceLabels): string {
  if (isLinkBlock(node)) return `${LINK_ICON} ${linkSourceName(node.sourceId, labels)}`
  const label = blockLabel(node)
  return label === '' ? ROOT_UNTITLED_LABEL : label
}

/** Размер `Ш×В` в px поля: экранные размеры делятся на зум и округляются. */
export function sizeText(rect: Rect, zoom: number): string {
  return `${String(Math.round(rect.width / zoom))}${SIZE_SEPARATOR}${String(Math.round(rect.height / zoom))}`
}

/**
 * Текст бейджа наведения: размер `Ш×В`, а у блока уже `LABEL_MIN_SCREEN_WIDTH` на экране (его подпись без текста)
 * или при выключенных подписях — `подпись · Ш×В`, чтобы имя было видно хотя бы при наведении (16.1).
 */
export function hoverBadgeText(
  node: LayoutNode,
  rect: Rect,
  size: string,
  labels: SourceLabels,
  labelsVisible: boolean,
): string {
  if (labelsVisible && rect.width >= LABEL_MIN_SCREEN_WIDTH) return size
  return [nodeCaption(node, labels), size].join(BADGE_SEPARATOR)
}

/** Текст бейджа выделения: `подпись · тип · Ш×В`. */
export function selectionBadgeText(node: LayoutNode, size: string, labels: SourceLabels): string {
  return [nodeCaption(node, labels), nodeTypeLabel(node), size].join(BADGE_SEPARATOR)
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

/** `true`, если точка лежит внутри прямоугольника (границы включительно). */
export function rectContains(rect: Rect, point: CanvasPoint): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height
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
export function breadcrumbSegments(path: readonly LayoutNode[], labels: SourceLabels): BreadcrumbSegment[] {
  return path.map((node) => ({ id: node.id, text: nodeCaption(node, labels) }))
}

/** Лежит ли блок `id` в поддереве блока `rootId` (включая его самого): для выхода из режима фокуса по клику мимо. */
export function isInSubtree(doc: LayoutDocument, rootId: NodeId, id: NodeId | null): boolean {
  return id !== null && getPath(doc, id).some((node) => node.id === rootId)
}

/** Предки блока `id` от корня до родителя (без него самого): их контуры видны при наведении (16.7). */
export function ancestorIds(doc: LayoutDocument, id: NodeId | null): NodeId[] {
  return id === null
    ? []
    : getPath(doc, id)
        .slice(0, -1)
        .map((node) => node.id)
}
