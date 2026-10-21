/**
 * Что нужно знать о выводе экспорта целиком: компоненты (корни-источники, которые подставятся на места связей) для
 * списка с описаниями и токены зазора для определений CSS-переменных у верхнего элемента.
 */
import { GAP_TOKENS, isLinkBlock, type BlockNode, type LayoutDocument, type NodeId } from '@shared'
import { CSS_PX_UNIT, GAP_TOKEN_PX, GAP_VAR_PREFIX, MIN_CHILDREN_FOR_GAP } from '@/scripts/pages/canvas/constants'
import type { StyleEntry } from '@/scripts/pages/canvas/node-style'
import { findRootEntry } from '@/scripts/pages/canvas/tree-query'

/** Токен зазора. */
type GapToken = (typeof GAP_TOKENS)[number]

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

/** Токены зазора в поддеревьях `nodes` (только там, где он выводится) с учётом подставленных источников, в порядке s, m, l. */
export function usedGaps(doc: LayoutDocument, nodes: readonly BlockNode[]): GapToken[] {
  const found = new Set<GapToken>()
  const seen = new Set<NodeId>()
  /** Обходит поддерево; связь раскрывается в источник (каждый источник один раз — защита от цикла). */
  function visit(node: BlockNode): void {
    if (isLinkBlock(node)) {
      const source = seen.has(node.sourceId) ? undefined : findRootEntry(doc, node.sourceId)?.node
      if (source === undefined) return
      seen.add(source.id)
      visit(source)
      return
    }
    if (node.container.gap !== undefined && node.children.length >= MIN_CHILDREN_FOR_GAP) found.add(node.container.gap)
    node.children.forEach(visit)
  }
  nodes.forEach(visit)
  return GAP_TOKENS.filter((token) => found.has(token))
}

/** Определения переменных зазора для верхнего элемента вывода: `--gap-m:16px` для каждого использованного токена. */
export function gapVarEntries(tokens: readonly GapToken[]): StyleEntry[] {
  return tokens.map((token) => [`${GAP_VAR_PREFIX}${token}`, `${String(GAP_TOKEN_PX[token])}${CSS_PX_UNIT}`])
}
