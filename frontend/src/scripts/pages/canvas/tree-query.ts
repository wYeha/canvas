/** Запросы к дереву документа без его изменения: поиск узла, родителя, пути и проверка вложенности. */
import type { BlockNode, LayoutDocument, LayoutNode, NodeId, RootEntry } from '@shared'
import type { NodeLocation } from './tree-types'

/** Ищет узел в поддереве `node` (сам узел не проверяется) и возвращает индексы детей до него. */
function findIndicesIn(node: LayoutNode, nodeId: NodeId): number[] | undefined {
  for (const [index, child] of node.children.entries()) {
    if (child.id === nodeId) return [index]
    const rest = findIndicesIn(child, nodeId)
    if (rest) return [index, ...rest]
  }
  return undefined
}

/** Находит положение узла в документе обходом в глубину по всем корням; `undefined`, если узла нет. */
export function locateNode(doc: LayoutDocument, nodeId: NodeId): NodeLocation | undefined {
  for (const [rootIndex, root] of doc.roots.entries()) {
    if (root.node.id === nodeId) return { rootIndex, indices: [] }
    const indices = findIndicesIn(root.node, nodeId)
    if (indices) return { rootIndex, indices }
  }
  return undefined
}

/** Возвращает узлы от корня до узла по положению: `[корень, ..., узел]`. */
function nodesAt(doc: LayoutDocument, loc: NodeLocation): LayoutNode[] {
  const root = doc.roots[loc.rootIndex]
  if (!root) return []
  const path: LayoutNode[] = [root.node]
  let current: LayoutNode = root.node
  for (const index of loc.indices) {
    const child: LayoutNode | undefined = current.children[index]
    if (!child) return []
    path.push(child)
    current = child
  }
  return path
}

/** Возвращает путь `[корень, ..., узел]`; `[]`, если узла нет. */
export function getPath(doc: LayoutDocument, nodeId: NodeId): LayoutNode[] {
  const loc = locateNode(doc, nodeId)
  return loc ? nodesAt(doc, loc) : []
}

/** Находит узел в любом корне документа. */
export function findNode(doc: LayoutDocument, nodeId: NodeId): LayoutNode | undefined {
  return getPath(doc, nodeId).at(-1)
}

/** Возвращает запись корня, только если `nodeId` — корневой блок. */
export function findRootEntry(doc: LayoutDocument, nodeId: NodeId): RootEntry | undefined {
  return doc.roots.find((root) => root.node.id === nodeId)
}

/** Возвращает родительский блок узла; `undefined` для корня и для отсутствующего узла. */
export function findParent(doc: LayoutDocument, nodeId: NodeId): BlockNode | undefined {
  return getPath(doc, nodeId).at(-2)
}

/** Проверяет, что `nodeId` лежит строго внутри поддерева `ancestorId` (сам узел потомком не считается). */
export function isDescendant(doc: LayoutDocument, ancestorId: NodeId, nodeId: NodeId): boolean {
  if (ancestorId === nodeId) return false
  return getPath(doc, nodeId).some((node) => node.id === ancestorId)
}
