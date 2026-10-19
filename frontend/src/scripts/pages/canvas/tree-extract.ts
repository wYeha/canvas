/**
 * «Вынести на канвас»: вложенный блок становится корнем-источником, а на его месте встаёт связь на него.
 * Свойства «как ребёнок» и повтор относятся к месту, поэтому переходят к связи. Без Vue и Pinia.
 */
import { isLinkBlock, type BlockNode, type LayoutDocument, type NodeId } from '@shared'
import { CSS_DEFAULT_FLEX, DEFAULT_REPEAT } from './constants'
import { addChild } from './tree'
import { collectDocIds } from './tree-internal'
import { moveNode } from './tree-move'
import { findNode, findParent, locateNode } from './tree-query'
import type { MoveTarget, TreeError } from './tree-types'

/** Цель вынесения: точка нового корня на поле и его ширина превью. */
export type ExtractTarget = Extract<MoveTarget, { type: 'canvas' }>

/**
 * Проверяет вынесение: блок существует, вложен (не корень) и не связь; `link` — пустая связь на этот блок с новым id.
 * Циклов вынесение не создаёт: рёбра корня `R → S` из поддерева блока становятся `R → X → S`.
 */
export function canExtractToCanvas(doc: LayoutDocument, nodeId: NodeId, link: BlockNode): TreeError | null {
  const node = findNode(doc, nodeId)
  if (!node) return 'node-not-found'
  if (isLinkBlock(node)) return 'link-to-canvas'
  if (findParent(doc, nodeId) === undefined) return 'target-not-found'
  if (link.sourceId !== nodeId || link.children.length > 0) return 'source-not-found'
  return collectDocIds(doc).has(link.id) ? 'duplicate-id' : null
}

/** Корень-источник: «как ребёнок» и повтор по умолчанию (место со своими свойствами теперь у связи). */
function asRoot(node: BlockNode): BlockNode {
  return { ...node, self: { flex: CSS_DEFAULT_FLEX }, repeat: DEFAULT_REPEAT }
}

/**
 * Выносит вложенный блок на канвас корнем в точку `target` и ставит на его место связь `link` на него.
 * Связь берёт `self` и повтор блока, корень — `self` и повтор по умолчанию. Недопустимое — тот же `doc`.
 */
export function extractToCanvas(
  doc: LayoutDocument,
  nodeId: NodeId,
  link: BlockNode,
  target: ExtractTarget,
): LayoutDocument {
  if (canExtractToCanvas(doc, nodeId, link) !== null) return doc
  const node = findNode(doc, nodeId)
  const parent = findParent(doc, nodeId)
  const index = locateNode(doc, nodeId)?.indices.at(-1)
  if (!node || !parent || index === undefined) return doc
  const moved = moveNode(doc, nodeId, target)
  if (moved === doc) return doc
  const withRoot = {
    ...moved,
    roots: moved.roots.map((entry) => (entry.node.id === nodeId ? { ...entry, node: asRoot(entry.node) } : entry)),
  }
  return addChild(withRoot, parent.id, { ...link, self: node.self, repeat: node.repeat }, index)
}
