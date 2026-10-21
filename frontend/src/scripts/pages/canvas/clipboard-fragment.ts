/**
 * Чистая логика фрагмента для системного буфера обмена (17.4): сборка (поддерево и корни-источники его связей,
 * зависимости — раньше зависящих) и подготовка документа к вставке — недостающие источники добавляются корнями со
 * своими id, чтобы связи вставленного блока нашли их. Без Vue и Pinia.
 */
import {
  FRAGMENT_FORMAT,
  FRAGMENT_VERSION,
  isLinkBlock,
  type LayoutDocument,
  type LayoutFragment,
  type LayoutNode,
  type NodeId,
  type RootEntry,
} from '@shared'
import type { CanvasPoint } from './factories'
import { IMPORTED_SOURCE_STEP } from './constants'
import { addRoot } from './tree'
import { collectDocIds } from './tree-internal'
import { findRootEntry } from './tree-query'

/**
 * Корни-источники связей в поддереве `node` (и в самих источниках — цепочки связей), каждый один раз, в порядке
 * «сначала то, на что ссылаются»: так их можно добавлять в документ по одному без висячих связей.
 */
export function collectSources(doc: LayoutDocument, node: LayoutNode): RootEntry[] {
  const found: RootEntry[] = []
  const seen = new Set<NodeId>([node.id])
  /** Обходит поддерево; источник связи сначала обходится сам, потом записывается. */
  function visit(current: LayoutNode): void {
    if (isLinkBlock(current)) {
      const source = seen.has(current.sourceId) ? undefined : findRootEntry(doc, current.sourceId)
      if (source === undefined) return
      seen.add(source.node.id)
      visit(source.node)
      found.push(source)
      return
    }
    current.children.forEach(visit)
  }
  visit(node)
  return found
}

/** Фрагмент для буфера: блок с поддеревом, ширина превью (если копировали корень) и источники его связей. */
export function buildFragment(doc: LayoutDocument, node: LayoutNode, rootWidth: number | null): LayoutFragment {
  return { format: FRAGMENT_FORMAT, version: FRAGMENT_VERSION, node, rootWidth, sources: collectSources(doc, node) }
}

/** Текст фрагмента для системного буфера: JSON. */
export function serializeFragment(fragment: LayoutFragment): string {
  return JSON.stringify(fragment)
}

/**
 * Документ с недостающими источниками фрагмента: те, чьих корней в документе нет, добавляются корнями со своими id
 * столбиком от точки `at` (шаг `IMPORTED_SOURCE_STEP`). Источник, чей id уже занят в документе другим узлом, не
 * добавляется — связи на него потом отбросятся как висячие. Вход не меняется.
 */
export function withFragmentSources(
  doc: LayoutDocument,
  sources: readonly RootEntry[],
  at: CanvasPoint,
): LayoutDocument {
  const used = collectDocIds(doc)
  const missing = sources.filter((source) => !used.has(source.node.id))
  return missing.reduce(
    (next, source, index) =>
      addRoot(next, {
        canvas: { ...source.canvas, x: at.x, y: at.y + index * IMPORTED_SOURCE_STEP },
        node: source.node,
      }),
    doc,
  )
}
