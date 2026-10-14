/** Тесты запросов к дереву: поиск узла, корня, родителя, пути и проверка вложенности. */
import { describe, expect, it } from 'vitest'
import { findNode, findParent, findRootEntry, getPath, isDescendant, locateNode } from '@/scripts/pages/canvas/tree'
import { makeDoc } from './tree-fixture'

describe('findNode', () => {
  const doc = makeDoc()

  it('находит корень, вложенный узел и связь', () => {
    expect(findNode(doc, 'B')?.id).toBe('B')
    expect(findNode(doc, 'a1x')?.id).toBe('a1x')
    expect(findNode(doc, 'linkB')?.type).toBe('link')
  })

  it('чужой id → undefined', () => {
    expect(findNode(doc, 'нет')).toBeUndefined()
  })
})

describe('findRootEntry', () => {
  const doc = makeDoc()

  it('возвращает запись только для корня', () => {
    expect(findRootEntry(doc, 'B')?.canvas.width).toBe(480)
    expect(findRootEntry(doc, 'b1')).toBeUndefined()
  })
})

describe('findParent', () => {
  const doc = makeDoc()

  it('возвращает родительский блок', () => {
    expect(findParent(doc, 'a1x')?.id).toBe('a1')
    expect(findParent(doc, 'linkB')?.id).toBe('A')
  })

  it('у корня и отсутствующего узла → undefined', () => {
    expect(findParent(doc, 'A')).toBeUndefined()
    expect(findParent(doc, 'нет')).toBeUndefined()
  })
})

describe('getPath и locateNode', () => {
  const doc = makeDoc()

  it('путь от корня до узла', () => {
    expect(getPath(doc, 'a1x').map((node) => node.id)).toEqual(['A', 'a1', 'a1x'])
    expect(getPath(doc, 'C').map((node) => node.id)).toEqual(['C'])
    expect(getPath(doc, 'нет')).toEqual([])
  })

  it('положение узла: индекс корня и индексы детей', () => {
    expect(locateNode(doc, 'a1y')).toEqual({ rootIndex: 0, indices: [0, 1] })
    expect(locateNode(doc, 'C')).toEqual({ rootIndex: 2, indices: [] })
    expect(locateNode(doc, 'нет')).toBeUndefined()
  })
})

describe('isDescendant', () => {
  const doc = makeDoc()

  it('строго внутри поддерева', () => {
    expect(isDescendant(doc, 'A', 'a1x')).toBe(true)
    expect(isDescendant(doc, 'a1', 'a1')).toBe(false)
    expect(isDescendant(doc, 'a1x', 'a1')).toBe(false)
    expect(isDescendant(doc, 'B', 'a1x')).toBe(false)
  })
})
