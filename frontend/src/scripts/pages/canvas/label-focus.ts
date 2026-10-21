/**
 * Чистая логика «фокуса подписей» (16.2): на мелком масштабе чипы видны только у выделенного блока, блока под
 * курсором и их предков — иначе чипы соседних уровней накладываются. Без Vue и Pinia.
 */
import type { LayoutDocument, NodeId } from '@shared'
import { LABEL_CHIPS_MIN_ZOOM } from './constants'
import { getPath } from './tree-query'

/** Id блоков, чьи чипы видны на мелком масштабе: цепочки от корня до выделенного и до наведённого блока. */
export function labelFocusIds(doc: LayoutDocument, selectedId: NodeId | null, hoveredId: NodeId | null): Set<NodeId> {
  const ids = new Set<NodeId>()
  for (const id of [selectedId, hoveredId]) {
    if (id !== null) for (const node of getPath(doc, id)) ids.add(node.id)
  }
  return ids
}

/** Мелкий масштаб: шрифт чипа, уменьшаясь вместе с полем, стал бы мельче читаемого порога. */
export function isSmallZoom(zoom: number): boolean {
  return zoom < LABEL_CHIPS_MIN_ZOOM
}
