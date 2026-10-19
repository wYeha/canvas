/** Тесты логики связей: индекс, граф корней, циклы, допустимость новой связи, источники в поддереве. */
import { describe, expect, it } from 'vitest'
import {
  SCHEMA_VERSION,
  buildLinkIndex,
  canConnectLink,
  cyclicLinkIds,
  isLinkBlock,
  isLinkSource,
  linkSourcesIn,
  linksCreateCycle,
  linksFromSource,
  type BlockNode,
  type LayoutDocument,
} from '@shared'

/** Блок с детьми. */
function block(id: string, children: BlockNode[] = []): BlockNode {
  return {
    id,
    type: 'block',
    label: id,
    description: '',
    tag: 'div',
    container: { kind: 'flex', direction: 'row', wrap: false, justify: 'flex-start', align: 'stretch' },
    self: {},
    repeat: 1,
    children,
  }
}

/** Блок-связь на корень `sourceId`. */
function link(id: string, sourceId: string): BlockNode {
  return { ...block(id), sourceId }
}

/** Документ из корней (без проверки схемой: логика должна работать и на «плохих» документах). */
function doc(...roots: BlockNode[]): LayoutDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'd',
    name: 'Д',
    labelCounter: 0,
    roots: roots.map((node) => ({ canvas: { x: 0, y: 0, width: 100, height: null, exportMaxWidth: false }, node })),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('buildLinkIndex', () => {
  it('корень каждого узла, размещения с целью и корнем, рёбра графа', () => {
    const d = doc(block('a', [block('x', [link('l1', 'c')])]), block('b', [link('l2', 'c')]), block('c'))
    const index = buildLinkIndex(d)
    expect(index.rootOf.get('l1')).toBe('a')
    expect(index.rootOf.get('c')).toBe('c')
    expect(index.placements).toEqual([
      { linkId: 'l1', sourceId: 'c', targetBlockId: 'x', rootId: 'a' },
      { linkId: 'l2', sourceId: 'c', targetBlockId: 'b', rootId: 'b' },
    ])
    expect([...(index.edges.get('a') ?? [])]).toEqual(['c'])
    expect([...(index.edges.get('c') ?? [])]).toEqual([])
  })
})

describe('циклы', () => {
  it('связь на свой корень, взаимные и через цепочку — циклы', () => {
    expect(cyclicLinkIds(doc(block('a', [link('l', 'a')])))).toEqual(new Set(['l']))
    expect(cyclicLinkIds(doc(block('a', [link('l1', 'b')]), block('b', [link('l2', 'a')])))).toEqual(
      new Set(['l1', 'l2']),
    )
    const chain = doc(block('a', [link('l1', 'b')]), block('b', [link('l2', 'c')]), block('c', [link('l3', 'a')]))
    expect(cyclicLinkIds(chain).size).toBe(3)
  })

  it('без цикла — пусто', () => {
    expect(cyclicLinkIds(doc(block('a', [link('l1', 'b')]), block('b', [link('l2', 'c')]), block('c'))).size).toBe(0)
  })

  it('linksCreateCycle: новые связи в корне цели', () => {
    const d = doc(block('a', [link('l1', 'b')]), block('b'), block('c'))
    expect(linksCreateCycle(d, ['a'], 'b')).toBe(true)
    expect(linksCreateCycle(d, ['b'], 'c')).toBe(false)
    expect(linksCreateCycle(d, [], 'a')).toBe(false)
  })
})

describe('canConnectLink', () => {
  const d = doc(block('a', [block('x'), link('l', 'b')]), block('b', [block('y')]), block('c'))

  it('источник — корень, цель — блок другого корня без цикла', () => {
    expect(canConnectLink(d, 'b', 'x')).toBe(true)
    expect(canConnectLink(d, 'c', 'y')).toBe(true)
  })

  it('нельзя: в себя, в свой поддерево, в корень, который источник уже включает, в связь, источник не корень', () => {
    expect(canConnectLink(d, 'b', 'b')).toBe(false)
    expect(canConnectLink(d, 'b', 'y')).toBe(false)
    expect(canConnectLink(d, 'a', 'y')).toBe(false)
    expect(canConnectLink(d, 'c', 'l')).toBe(false)
    expect(canConnectLink(d, 'x', 'y')).toBe(false)
    expect(canConnectLink(d, 'b', 'nope')).toBe(false)
  })
})

describe('запросы', () => {
  const d = doc(block('a', [link('l1', 'c'), block('x', [link('l2', 'c')])]), block('c'))

  it('isLinkBlock, linkSourcesIn, linksFromSource, isLinkSource', () => {
    expect(isLinkBlock(link('l', 'c'))).toBe(true)
    expect(isLinkBlock(block('x'))).toBe(false)
    expect(linkSourcesIn(d.roots[0]?.node ?? block('none'))).toEqual(['c', 'c'])
    expect(linksFromSource(d, 'c').map((placement) => placement.linkId)).toEqual(['l1', 'l2'])
    expect(isLinkSource(d, 'c')).toBe(true)
    expect(isLinkSource(d, 'a')).toBe(false)
  })
})
