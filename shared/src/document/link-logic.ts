/**
 * Чистая логика связей: связь — блок с `sourceId`, на его месте при экспорте стоит корневой блок-источник (вложение).
 * Индекс связей за один обход, граф корней, запрет циклов и запросы «кто куда подключён».
 */
import type { LayoutDocument } from './document'
import type { BlockNode, NodeId } from './node'

/** Одно размещение связи: блок-связь, корень-источник, блок-цель (родитель связи) и корень, где стоит связь. */
export interface LinkPlacement {
  linkId: NodeId
  sourceId: NodeId
  targetBlockId: NodeId
  rootId: NodeId
}

/**
 * Индекс связей документа за один обход. Ребро графа корней `R → S`: в поддереве корня `R` есть связь на источник `S`
 * (содержимое `R` при экспорте включает `S`).
 */
export interface LinkIndex {
  /** Узел → id корня, в поддереве которого он лежит (корень указывает сам на себя). */
  rootOf: ReadonlyMap<NodeId, NodeId>
  /** Все связи документа. */
  placements: readonly LinkPlacement[]
  /** Корень → источники связей внутри его поддерева. */
  edges: ReadonlyMap<NodeId, ReadonlySet<NodeId>>
}

/** Блок — связь (у него есть источник). */
export function isLinkBlock(node: BlockNode): node is BlockNode & { sourceId: NodeId } {
  return node.sourceId !== undefined
}

/** Обходит поддерево блока: вызывает `visit` для каждого узла вместе с его родителем (у самого блока — `null`). */
function walk(node: BlockNode, parent: BlockNode | null, visit: (node: BlockNode, parent: BlockNode | null) => void) {
  visit(node, parent)
  for (const child of node.children) walk(child, node, visit)
}

/**
 * Индексы по документам: документ неизменяемый (каждая правка — новый объект), поэтому индекс одного документа
 * считается один раз. Проверки при перетаскивании зовут его на каждое движение мыши.
 */
const indexCache = new WeakMap<LayoutDocument, LinkIndex>()

/** Индекс связей документа (из кеша или за один обход всех узлов). */
export function buildLinkIndex(doc: LayoutDocument): LinkIndex {
  const cached = indexCache.get(doc)
  if (cached !== undefined) return cached
  const index = computeLinkIndex(doc)
  indexCache.set(doc, index)
  return index
}

/** Строит индекс связей документа за один обход всех узлов. */
function computeLinkIndex(doc: LayoutDocument): LinkIndex {
  const rootOf = new Map<NodeId, NodeId>()
  const placements: LinkPlacement[] = []
  const edges = new Map<NodeId, Set<NodeId>>()
  for (const { node: root } of doc.roots) {
    const sources = new Set<NodeId>()
    walk(root, null, (node, parent) => {
      rootOf.set(node.id, root.id)
      if (!isLinkBlock(node) || !parent) return
      placements.push({ linkId: node.id, sourceId: node.sourceId, targetBlockId: parent.id, rootId: root.id })
      sources.add(node.sourceId)
    })
    edges.set(root.id, sources)
  }
  return { rootOf, placements, edges }
}

/** Источники всех связей поддерева (с повторами не важно — для проверки циклов). */
export function linkSourcesIn(node: BlockNode): NodeId[] {
  const sources: NodeId[] = []
  walk(node, null, (current) => {
    if (isLinkBlock(current)) sources.push(current.sourceId)
  })
  return sources
}

/** Достижим ли корень `to` из корня `from` по рёбрам графа (сам `from` достижим). */
function reachesRoot(index: LinkIndex, from: NodeId, to: NodeId): boolean {
  const seen = new Set<NodeId>()
  const stack = [from]
  while (stack.length > 0) {
    const current = stack.pop()
    if (current === undefined || seen.has(current)) continue
    if (current === to) return true
    seen.add(current)
    stack.push(...(index.edges.get(current) ?? []))
  }
  return false
}

/**
 * Цикл для связи на `sourceId` в корне `targetRootId`: это тот же корень или источник через свои связи (транзитивно)
 * уже включает этот корень — подстановка источников при экспорте не закончилась бы.
 */
export function isCycleInIndex(index: LinkIndex, sourceId: NodeId, targetRootId: NodeId): boolean {
  return reachesRoot(index, sourceId, targetRootId)
}

/**
 * Появится ли цикл, если связи на `sourceIds` окажутся в корне `targetRootId` документа `doc`. Новые рёбра выходят
 * только из `targetRootId`, поэтому достаточно графа текущего `doc`.
 */
export function linksCreateCycle(doc: LayoutDocument, sourceIds: readonly NodeId[], targetRootId: NodeId): boolean {
  if (sourceIds.length === 0) return false
  const index = buildLinkIndex(doc)
  return sourceIds.some((sourceId) => isCycleInIndex(index, sourceId, targetRootId))
}

/** Id связей, замыкающих цикл (индекс строится один раз на документ). */
export function cyclicLinkIds(doc: LayoutDocument): Set<NodeId> {
  const index = buildLinkIndex(doc)
  const cyclic = index.placements.filter((placement) => isCycleInIndex(index, placement.sourceId, placement.rootId))
  return new Set(cyclic.map((placement) => placement.linkId))
}

/** Является ли узел корнем документа. */
export function isRootId(doc: LayoutDocument, nodeId: NodeId): boolean {
  return doc.roots.some((root) => root.node.id === nodeId)
}

/** Все связи, ведущие из корня-источника. */
export function linksFromSource(doc: LayoutDocument, sourceId: NodeId): LinkPlacement[] {
  return buildLinkIndex(doc).placements.filter((placement) => placement.sourceId === sourceId)
}

/** Подключён ли корень куда-нибудь (является источником хотя бы одной связи). */
export function isLinkSource(doc: LayoutDocument, rootId: NodeId): boolean {
  return linksFromSource(doc, rootId).length > 0
}

/**
 * Можно ли поставить связь на `sourceId` в блок `targetBlockId`: источник — существующий корень, цель — существующий
 * блок, не связь, и без цикла (цель не внутри источника и не в корне, который источник уже включает).
 */
export function canConnectLink(doc: LayoutDocument, sourceId: NodeId, targetBlockId: NodeId): boolean {
  if (!isRootId(doc, sourceId)) return false
  const index = buildLinkIndex(doc)
  const targetRootId = index.rootOf.get(targetBlockId)
  if (targetRootId === undefined) return false
  if (index.placements.some((placement) => placement.linkId === targetBlockId)) return false
  return !isCycleInIndex(index, sourceId, targetRootId)
}
