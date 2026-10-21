/** Компоненты в выводе экспорта: корни-источники, которые подставятся на места связей (для списка с описаниями). */
import { isLinkBlock, type BlockNode, type LayoutDocument, type NodeId } from '@shared'
import { findRootEntry } from '@/scripts/pages/canvas/tree-query'

/**
 * Корни-источники, которые экспорт подставит в поддеревья `nodes` (в том числе через связи внутри источников),
 * по порядку первого появления в выводе. Каждый — один раз; источник, совпадающий с выводимым корнем
 * (`outputIds`), не считается компонентом: подстановки в себя экспорт не делает.
 */
export function usedComponents(
  doc: LayoutDocument,
  nodes: readonly BlockNode[],
  outputIds: readonly NodeId[] = [],
): BlockNode[] {
  const seen = new Set<NodeId>(outputIds)
  const found: BlockNode[] = []
  /** Обходит поддерево в порядке вывода и раскрывает связи на ещё не встреченные источники. */
  function visit(node: BlockNode): void {
    if (isLinkBlock(node)) {
      const source = seen.has(node.sourceId) ? undefined : findRootEntry(doc, node.sourceId)?.node
      if (source === undefined) return
      seen.add(source.id)
      found.push(source)
      source.children.forEach(visit)
      return
    }
    node.children.forEach(visit)
  }
  nodes.forEach(visit)
  return found
}
