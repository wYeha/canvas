/** Тесты логики связей: сравнение подписей, режим слияния / вложения, циклы и запросы «кто куда подключён». */
import { describe, expect, it } from 'vitest'
import {
  SCHEMA_VERSION,
  buildLinkIndex,
  canConnectLink,
  collectLinkPlacements,
  cyclicLinkIds,
  findRoot,
  linksCreateCycle,
  documentHasLinkCycles,
  isLinkSource,
  labelsMatch,
  linkMode,
  linkTargetBlock,
  linksFromSource,
  linksIntoBlock,
  normalizeLinkLabel,
  wouldCreateLinkCycle,
  type BlockNode,
  type LayoutDocument,
  type LinkNode,
} from '@shared'

/** Собирает минимальный flex-блок с подписью и детьми. */
function block(id: string, label: string, children: BlockNode['children'] = []): BlockNode {
  return {
    id,
    type: 'block',
    label,
    description: '',
    tag: 'div',
    container: { kind: 'flex', direction: 'row', wrap: false, justify: 'flex-start', align: 'stretch', gap: null },
    self: {},
    padding: null,
    repeat: 1,
    children,
  }
}

/** Собирает плашку связи на источник. */
function link(id: string, sourceId: string): LinkNode {
  return { id, type: 'link', sourceId, self: {} }
}

/** Собирает документ из корневых блоков. */
function documentOf(...nodes: BlockNode[]): LayoutDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'doc-1',
    name: 'Связи',
    labelCounter: 0,
    roots: nodes.map((node, index) => ({
      canvas: { x: index * 100, y: 0, width: 480, height: null, exportMaxWidth: false },
      node,
    })),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

/**
 * Документ: Page [kpiSlot «kpi» [l1 → KPI], side [l2 → KPI, extra], l3 → Card], KPI « KPI » [inner],
 * Card «Card» [cardInner [l4 → KPI]].
 */
function makeDoc(): LayoutDocument {
  const page = block('page', 'Page', [
    block('kpiSlot', 'kpi', [link('l1', 'KPI')]),
    block('side', 'KPI', [link('l2', 'KPI'), block('extra', 'Extra')]),
    link('l3', 'card'),
  ])
  const kpi = block('KPI', ' KPI ', [block('inner', 'Inner')])
  const card = block('card', 'Card', [block('cardInner', 'Inner', [link('l4', 'KPI')])])
  return documentOf(page, kpi, card)
}

/** Возвращает плашку документа по id или падает. */
function linkById(doc: LayoutDocument, linkId: string): LinkNode {
  const placement = collectLinkPlacements(doc).find((item) => item.linkId === linkId)
  if (!placement) throw new Error(`Нет плашки ${linkId}`)
  return link(placement.linkId, placement.sourceId)
}

describe('подписи', () => {
  it('нормализуются: trim и нижний регистр, пустые — null', () => {
    expect(normalizeLinkLabel('  Шапка ')).toBe('шапка')
    expect(normalizeLinkLabel('   ')).toBeNull()
    expect(normalizeLinkLabel('')).toBeNull()
  })

  it('совпадают без учёта регистра и пробелов по краям, пустые не совпадают', () => {
    expect(labelsMatch(' KPI ', 'kpi')).toBe(true)
    expect(labelsMatch('Карточка', 'КАРТОЧКА')).toBe(true)
    expect(labelsMatch('KPI', 'KPI 2')).toBe(false)
    expect(labelsMatch('', '')).toBe(false)
    expect(labelsMatch('  ', ' ')).toBe(false)
  })
})

describe('linkMode', () => {
  it('подписи совпадают и плашка — единственный ребёнок цели → merge', () => {
    const doc = makeDoc()
    expect(linkMode(doc, linkById(doc, 'l1'))).toBe('merge')
  })

  it('в цели есть ещё блок → embed', () => {
    const doc = makeDoc()
    expect(linkMode(doc, linkById(doc, 'l2'))).toBe('embed')
  })

  it('в цели есть ещё одна плашка → embed', () => {
    const doc = documentOf(block('t', 'kpi', [link('a', 'KPI'), link('b', 'KPI')]), block('KPI', 'KPI'))
    expect(linkMode(doc, linkById(doc, 'a'))).toBe('embed')
  })

  it('подписи не совпадают → embed', () => {
    const doc = makeDoc()
    expect(linkMode(doc, linkById(doc, 'l4'))).toBe('embed')
  })

  it('пустые подписи → embed', () => {
    const doc = documentOf(block('t', '', [link('a', 's')]), block('s', ' '))
    expect(linkMode(doc, linkById(doc, 'a'))).toBe('embed')
  })

  it('плашки нет в документе или нет источника → embed', () => {
    const doc = makeDoc()
    expect(linkMode(doc, link('нет', 'KPI'))).toBe('embed')
    const dangling = documentOf(block('t', 'x', [link('a', 'нет')]))
    expect(linkMode(dangling, linkById(dangling, 'a'))).toBe('embed')
  })

  it('режим пересчитывается при смене подписи цели', () => {
    const doc = makeDoc()
    const renamed = documentOf(
      ...doc.roots.map((root) =>
        root.node.id === 'card' ? block('card', 'Card', [block('cardInner', 'kpi', [link('l4', 'KPI')])]) : root.node,
      ),
    )
    expect(linkMode(renamed, linkById(renamed, 'l4'))).toBe('merge')
  })
})

describe('кто куда подключён', () => {
  it('collectLinkPlacements возвращает все плашки с целями', () => {
    const doc = makeDoc()
    const placements = collectLinkPlacements(doc)
    expect(placements).toHaveLength(4)
    expect(placements).toContainEqual({ linkId: 'l3', sourceId: 'card', targetBlockId: 'page' })
    expect(placements).toContainEqual({ linkId: 'l4', sourceId: 'KPI', targetBlockId: 'cardInner' })
  })

  it('linksFromSource и linksIntoBlock', () => {
    const doc = makeDoc()
    expect(linksFromSource(doc, 'KPI').map((item) => item.linkId)).toEqual(expect.arrayContaining(['l1', 'l2', 'l4']))
    expect(linksFromSource(doc, 'KPI')).toHaveLength(3)
    expect(linksFromSource(doc, 'page')).toEqual([])
    expect(linksIntoBlock(doc, 'side').map((item) => item.linkId)).toEqual(['l2'])
    expect(linksIntoBlock(doc, 'нет')).toEqual([])
  })

  it('linkTargetBlock и isLinkSource', () => {
    const doc = makeDoc()
    expect(linkTargetBlock(doc, 'l4')?.id).toBe('cardInner')
    expect(linkTargetBlock(doc, 'нет')).toBeUndefined()
    expect(isLinkSource(doc, 'KPI')).toBe(true)
    expect(isLinkSource(doc, 'card')).toBe(true)
    expect(isLinkSource(doc, 'page')).toBe(false)
  })
})

describe('циклы', () => {
  it('цель — сам источник или его потомок → цикл', () => {
    const doc = makeDoc()
    expect(wouldCreateLinkCycle(doc, 'KPI', 'KPI')).toBe(true)
    expect(wouldCreateLinkCycle(doc, 'KPI', 'inner')).toBe(true)
    expect(wouldCreateLinkCycle(doc, 'card', 'cardInner')).toBe(true)
  })

  it('цель вне источника → не цикл', () => {
    const doc = makeDoc()
    expect(wouldCreateLinkCycle(doc, 'KPI', 'page')).toBe(false)
    expect(wouldCreateLinkCycle(doc, 'KPI', 'cardInner')).toBe(false)
    expect(wouldCreateLinkCycle(doc, 'card', 'page')).toBe(false)
  })

  it('цель в корне, который источник уже включает через связи → транзитивный цикл', () => {
    const doc = makeDoc()
    // card → KPI: связь на card внутри KPI замкнула бы KPI → card → KPI
    expect(wouldCreateLinkCycle(doc, 'card', 'inner')).toBe(true)
    // page → card → KPI: связь на page внутри KPI или card — цикл длины 2 и 3
    expect(wouldCreateLinkCycle(doc, 'page', 'cardInner')).toBe(true)
    expect(wouldCreateLinkCycle(doc, 'page', 'inner')).toBe(true)
  })

  it('buildLinkIndex: корни блоков и рёбра графа корней', () => {
    const index = buildLinkIndex(makeDoc())
    expect(index.rootOf.get('cardInner')).toBe('card')
    expect(index.rootOf.get('KPI')).toBe('KPI')
    expect([...(index.edges.get('page') ?? [])].sort()).toEqual(['KPI', 'card'])
    expect([...(index.edges.get('KPI') ?? [])]).toEqual([])
    expect(index.placements).toHaveLength(4)
  })

  it('findRoot находит корень блока и плашки', () => {
    const doc = makeDoc()
    expect(findRoot(doc, 'l4')).toBe('card')
    expect(findRoot(doc, 'card')).toBe('card')
    expect(findRoot(doc, 'нет')).toBeUndefined()
  })

  it('linksCreateCycle и cyclicLinkIds', () => {
    const doc = makeDoc()
    expect(linksCreateCycle(doc, ['KPI', 'card'], 'page')).toBe(false)
    expect(linksCreateCycle(doc, ['page'], 'KPI')).toBe(true)
    const ring = documentOf(
      block('a', 'A', [link('ab', 'b')]),
      block('b', 'B', [link('bc', 'c')]),
      block('c', 'C', [link('ca', 'a')]),
    )
    expect([...cyclicLinkIds(ring)].sort()).toEqual(['ab', 'bc', 'ca'])
    expect(cyclicLinkIds(doc).size).toBe(0)
  })

  it('documentHasLinkCycles', () => {
    expect(documentHasLinkCycles(makeDoc())).toBe(false)
    expect(documentHasLinkCycles(documentOf(block('s', 'S', [block('in', 'In', [link('l', 's')])])))).toBe(true)
    const pair = documentOf(block('a', 'A', [link('ab', 'b')]), block('b', 'B', [link('ba', 'a')]))
    expect(documentHasLinkCycles(pair)).toBe(true)
  })

  it('canConnectLink: источник — корень, цель — блок, без цикла', () => {
    const doc = makeDoc()
    expect(canConnectLink(doc, 'KPI', 'page')).toBe(true)
    expect(canConnectLink(doc, 'KPI', 'inner')).toBe(false)
    expect(canConnectLink(doc, 'inner', 'page')).toBe(false)
    expect(canConnectLink(doc, 'KPI', 'l3')).toBe(false)
    expect(canConnectLink(doc, 'KPI', 'нет')).toBe(false)
    expect(canConnectLink(doc, 'page', 'cardInner')).toBe(false)
  })
})
