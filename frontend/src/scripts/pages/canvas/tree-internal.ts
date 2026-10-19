/**
 * Внутренние хелперы операций над деревом со структурным разделением: копируется только путь до изменённого узла,
 * остальные ветки остаются теми же ссылками. Наружу (из фасада `tree.ts`) не реэкспортируются.
 */
import { findRoot, linksCreateCycle, type LayoutDocument, type LayoutNode, type NodeId } from '@shared'
import type { NodeLocation } from './tree-types'

/** Преобразование узла; вернуть тот же объект — значит «ничего не менять». */
type NodeUpdater = (node: LayoutNode) => LayoutNode

/** Заменяет узел по индексам детей внутри `node`, копируя только ветку пути. */
function updateIn(node: LayoutNode, indices: readonly number[], fn: NodeUpdater): LayoutNode {
  const [index, ...rest] = indices
  if (index === undefined) return fn(node)
  if (node.type !== 'block') return node
  const child = node.children[index]
  if (!child) return node
  const next = updateIn(child, rest, fn)
  if (next === child) return node
  const children = [...node.children]
  children[index] = next
  return { ...node, children }
}

/** Возвращает узел по уже найденному положению без повторного поиска по id. */
export function nodeAt(doc: LayoutDocument, loc: NodeLocation): LayoutNode | undefined {
  let node: LayoutNode | undefined = doc.roots[loc.rootIndex]?.node
  for (const index of loc.indices) node = node?.type === 'block' ? node.children[index] : undefined
  return node
}

/** Заменяет узел по положению результатом `fn`; если узел не изменился, возвращает тот же `doc`. */
export function updateAtLocation(doc: LayoutDocument, loc: NodeLocation, fn: NodeUpdater): LayoutDocument {
  const root = doc.roots[loc.rootIndex]
  if (!root) return doc
  const node = updateIn(root.node, loc.indices, fn)
  if (node === root.node) return doc
  // Корень всегда блок: перенос связи на место корня запрещён проверками выше по стеку
  if (node.type !== 'block') return doc
  const roots = [...doc.roots]
  roots[loc.rootIndex] = { ...root, node }
  return { ...doc, roots }
}

/** Удаляет узел по положению; для корня убирает его запись из `roots`. Связи на него не чистит. */
export function removeAtLocation(doc: LayoutDocument, loc: NodeLocation): LayoutDocument {
  const last = loc.indices.at(-1)
  if (last === undefined) {
    if (!doc.roots[loc.rootIndex]) return doc
    return { ...doc, roots: doc.roots.filter((_, index) => index !== loc.rootIndex) }
  }
  const parentLoc: NodeLocation = { rootIndex: loc.rootIndex, indices: loc.indices.slice(0, -1) }
  return updateAtLocation(doc, parentLoc, (parent) => {
    if (parent.type !== 'block' || !parent.children[last]) return parent
    return { ...parent, children: parent.children.filter((_, index) => index !== last) }
  })
}

/** Возвращает новый массив со вставленным элементом; индекс зажимается в `[0, length]`. */
export function insertAt<T>(arr: readonly T[], index: number, item: T): T[] {
  const at = Math.min(Math.max(index, 0), arr.length)
  return [...arr.slice(0, at), item, ...arr.slice(at)]
}

/** Собирает id всех узлов поддерева, включая сам узел. */
export function collectIds(node: LayoutNode): NodeId[] {
  if (node.type !== 'block') return [node.id]
  return [node.id, ...node.children.flatMap(collectIds)]
}

/** Собирает id всех узлов документа. */
export function collectDocIds(doc: LayoutDocument): Set<NodeId> {
  return new Set(doc.roots.flatMap((root) => collectIds(root.node)))
}

/** Собирает `sourceId` всех плашек поддерева. */
export function collectLinkSources(node: LayoutNode): NodeId[] {
  if (node.type === 'link') return [node.sourceId]
  return node.children.flatMap(collectLinkSources)
}

/**
 * Проверяет, появится ли цикл связей, если поддерево `node` встанет ребёнком блока `parentId` документа `doc`
 * (`null` — само станет новым корнем). Все плашки поддерева окажутся в одном корне R (корне `parentId` или самом
 * `node`); цикл — если источник плашки и есть R или уже включает R через цепочку связей (граф корней `doc`).
 * При переносе в `doc` передаётся документ уже без переносимого узла: его плашки не должны считаться рёбрами старого корня.
 */
export function subtreeHasLinkCycle(doc: LayoutDocument, node: LayoutNode, parentId: NodeId | null): boolean {
  const rootId = parentId === null ? node.id : findRoot(doc, parentId)
  if (rootId === undefined) return false
  return linksCreateCycle(doc, collectLinkSources(node), rootId)
}

/** Убирает из поддерева блока связи на `sourceId`; без изменений возвращает тот же блок. */
function stripLinks<T extends LayoutNode>(node: T, sourceId: NodeId): T {
  if (node.type !== 'block') return node
  let changed = false
  const children: LayoutNode[] = []
  for (const child of node.children) {
    if (child.type === 'link' && child.sourceId === sourceId) {
      changed = true
      continue
    }
    const next = stripLinks(child, sourceId)
    if (next !== child) changed = true
    children.push(next)
  }
  return changed ? { ...node, children } : node
}

/** Удаляет все связи на `sourceId` во всём документе; пересобирает только затронутые корни и ветки. */
export function removeLinksTo(doc: LayoutDocument, sourceId: NodeId): LayoutDocument {
  const roots = doc.roots.map((root) => {
    const node = stripLinks(root.node, sourceId)
    return node === root.node ? root : { ...root, node }
  })
  return roots.every((root, index) => root === doc.roots[index]) ? doc : { ...doc, roots }
}
