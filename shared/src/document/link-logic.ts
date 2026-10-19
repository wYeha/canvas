/**
 * Чистая логика связей: режим (слияние / вложение) по подписям, запрет циклов и запросы «кто куда подключён».
 * Режим не хранится в документе, а вычисляется здесь по текущему дереву (DESIGN.md, раздел «Связи»).
 */
import { LINK_MODE } from './constants'
import type { LayoutDocument } from './document'
import type { BlockNode, LayoutNode, LinkNode, NodeId } from './node'

/** Режим связи на канвасе и в экспорте: слияние источника с целью или вложение ребёнком цели. */
export type LinkMode = (typeof LINK_MODE)[keyof typeof LINK_MODE]

/** Одно размещение связи: плашка в дереве, корень-источник и блок-цель (родитель плашки). */
export interface LinkPlacement {
  linkId: NodeId
  sourceId: NodeId
  targetBlockId: NodeId
}

/** Нормализует подпись для сравнения: без пробелов по краям и без учёта регистра; пустая — `null`. */
export function normalizeLinkLabel(label: string): string | null {
  const trimmed = label.trim()
  return trimmed === '' ? null : trimmed.toLowerCase()
}

/** Проверяет совпадение подписей источника и цели; пустые подписи не совпадают ни с чем. */
export function labelsMatch(sourceLabel: string, targetLabel: string): boolean {
  const source = normalizeLinkLabel(sourceLabel)
  return source !== null && source === normalizeLinkLabel(targetLabel)
}

/**
 * Индекс связей документа, построенный за один обход: корень каждого блока, все размещения плашек и граф корней.
 * Ребро `R → S` графа: в поддереве корня `R` есть плашка на источник `S` (содержимое `R` включает `S`).
 */
export interface LinkIndex {
  /** Блок → id корня, в поддереве которого он лежит (корень указывает сам на себя). */
  rootOf: ReadonlyMap<NodeId, NodeId>
  /** Блок → сам блок, для поиска по id без повторного обхода. */
  blocks: ReadonlyMap<NodeId, BlockNode>
  /** Все плашки документа с блоками-целями. */
  placements: readonly LinkPlacement[]
  /** Корень → источники связей внутри его поддерева. */
  edges: ReadonlyMap<NodeId, ReadonlySet<NodeId>>
}

/** Собирает все блоки поддерева, включая сам узел, если он блок. */
function blocksOf(node: LayoutNode): BlockNode[] {
  if (node.type !== 'block') return []
  return [node, ...node.children.flatMap(blocksOf)]
}

/** Собирает размещения плашек одного блока. */
function placementsOf(block: BlockNode): LinkPlacement[] {
  return block.children.flatMap((child) =>
    child.type === 'link' ? [{ linkId: child.id, sourceId: child.sourceId, targetBlockId: block.id }] : [],
  )
}

/** Строит индекс связей документа за один обход всех блоков. */
export function buildLinkIndex(doc: LayoutDocument): LinkIndex {
  const rootOf = new Map<NodeId, NodeId>()
  const blocks = new Map<NodeId, BlockNode>()
  const placements: LinkPlacement[] = []
  const edges = new Map<NodeId, Set<NodeId>>()
  for (const root of doc.roots) {
    const sources = new Set<NodeId>()
    for (const block of blocksOf(root.node)) {
      rootOf.set(block.id, root.node.id)
      blocks.set(block.id, block)
      for (const placement of placementsOf(block)) {
        placements.push(placement)
        sources.add(placement.sourceId)
      }
    }
    edges.set(root.node.id, sources)
  }
  return { rootOf, blocks, placements, edges }
}

/** Проверяет, есть ли узел `nodeId` среди потомков блока (сам блок не считается). */
function containsNode(block: BlockNode, nodeId: NodeId): boolean {
  return block.children.some((child) => child.id === nodeId || (child.type === 'block' && containsNode(child, nodeId)))
}

/** Возвращает id корня, в поддереве которого лежит узел (блок или плашка); `undefined`, если узла нет. */
export function findRoot(doc: LayoutDocument, nodeId: NodeId): NodeId | undefined {
  return doc.roots.find((root) => root.node.id === nodeId || containsNode(root.node, nodeId))?.node.id
}

/** Проверяет, достижим ли корень `to` из корня `from` по рёбрам графа корней (сам `from` достижим). */
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
 * Проверяет цикл для плашки на `sourceId`, стоящей в корне `targetRootId`: цикл, если это тот же корень или
 * источник через свои плашки (транзитивно) уже включает этот корень — подстановка источников не закончится.
 */
export function isCycleInIndex(index: LinkIndex, sourceId: NodeId, targetRootId: NodeId): boolean {
  return reachesRoot(index, sourceId, targetRootId)
}

/** Возвращает блок-цель плашки (её родителя); `undefined`, если плашки нет в документе. */
export function linkTargetBlock(doc: LayoutDocument, linkId: NodeId): BlockNode | undefined {
  const index = buildLinkIndex(doc)
  const placement = index.placements.find((item) => item.linkId === linkId)
  return placement && index.blocks.get(placement.targetBlockId)
}

/**
 * Вычисляет режим связи. Слияние — если подписи источника и цели совпадают и плашка — единственный ребёнок цели
 * (любой другой ребёнок, блок или другая плашка, даёт вложение). Без источника или цели — вложение.
 */
export function linkMode(doc: LayoutDocument, link: LinkNode): LinkMode {
  const target = linkTargetBlock(doc, link.id)
  const source = doc.roots.find((root) => root.node.id === link.sourceId)?.node
  if (!target || !source) return LINK_MODE.embed
  const merge = labelsMatch(source.label, target.label) && target.children.length === 1
  return merge ? LINK_MODE.merge : LINK_MODE.embed
}

/** Возвращает все связи документа вместе с блоками-целями. */
export function collectLinkPlacements(doc: LayoutDocument): LinkPlacement[] {
  return [...buildLinkIndex(doc).placements]
}

/** Возвращает все связи, ведущие из корня-источника. */
export function linksFromSource(doc: LayoutDocument, sourceId: NodeId): LinkPlacement[] {
  return collectLinkPlacements(doc).filter((placement) => placement.sourceId === sourceId)
}

/** Возвращает все связи, стоящие внутри блока-цели (его прямые дети-плашки). */
export function linksIntoBlock(doc: LayoutDocument, targetBlockId: NodeId): LinkPlacement[] {
  const target = buildLinkIndex(doc).blocks.get(targetBlockId)
  return target ? placementsOf(target) : []
}

/** Проверяет, ссылается ли на корень хотя бы одна связь документа. */
export function isLinkSource(doc: LayoutDocument, rootId: NodeId): boolean {
  return linksFromSource(doc, rootId).length > 0
}

/**
 * Проверяет, будет ли цикл, если плашка на `sourceId` встанет в блок `targetBlockId`: цель — сам источник,
 * лежит в его поддереве или в корне, который источник уже включает через свои связи (транзитивно).
 */
export function wouldCreateLinkCycle(doc: LayoutDocument, sourceId: NodeId, targetBlockId: NodeId): boolean {
  if (targetBlockId === sourceId) return true
  const index = buildLinkIndex(doc)
  const targetRootId = index.rootOf.get(targetBlockId)
  return targetRootId !== undefined && isCycleInIndex(index, sourceId, targetRootId)
}

/**
 * Проверяет, появится ли цикл, если плашки на `sourceIds` окажутся в корне `targetRootId` документа `doc`.
 * Новые рёбра выходят только из `targetRootId`, поэтому достаточно графа текущего `doc`.
 */
export function linksCreateCycle(doc: LayoutDocument, sourceIds: readonly NodeId[], targetRootId: NodeId): boolean {
  const index = buildLinkIndex(doc)
  return sourceIds.some((sourceId) => isCycleInIndex(index, sourceId, targetRootId))
}

/** Возвращает id плашек, замыкающих цикл связей (индекс строится один раз на весь документ). */
export function cyclicLinkIds(doc: LayoutDocument): Set<NodeId> {
  const index = buildLinkIndex(doc)
  const cyclic = index.placements.filter((placement) => {
    const targetRootId = index.rootOf.get(placement.targetBlockId)
    return targetRootId !== undefined && isCycleInIndex(index, placement.sourceId, targetRootId)
  })
  return new Set(cyclic.map((placement) => placement.linkId))
}

/** Проверяет, есть ли в документе хотя бы одна связь с циклом. */
export function documentHasLinkCycles(doc: LayoutDocument): boolean {
  return cyclicLinkIds(doc).size > 0
}

/** Проверяет, можно ли провести связь: источник — существующий корень, цель — существующий блок, без цикла. */
export function canConnectLink(doc: LayoutDocument, sourceId: NodeId, targetBlockId: NodeId): boolean {
  if (!doc.roots.some((root) => root.node.id === sourceId)) return false
  const index = buildLinkIndex(doc)
  const targetRootId = index.rootOf.get(targetBlockId)
  return targetRootId !== undefined && !isCycleInIndex(index, sourceId, targetRootId)
}
