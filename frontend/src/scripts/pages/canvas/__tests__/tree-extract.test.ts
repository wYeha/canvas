/** Тесты «Вынести на канвас»: блок становится корнем, на его месте — связь с его свойствами места; отказы. */
import { describe, expect, it } from 'vitest'
import { createLinkBlock } from '@/scripts/pages/canvas/factories'
import { canExtractToCanvas, extractToCanvas, type ExtractTarget } from '@/scripts/pages/canvas/tree-extract'
import { updateNode } from '@/scripts/pages/canvas/tree'
import { findNode, findRootEntry } from '@/scripts/pages/canvas/tree-query'
import { childIds, expectValid, makeDoc } from './tree-fixture'

const TARGET: ExtractTarget = { type: 'canvas', at: { x: 2000, y: 40 }, width: 640 }

/** Связь на `sourceId` с заданным id. */
function linkTo(sourceId: string, id = 'L') {
  return { ...createLinkBlock(sourceId), id }
}

describe('extractToCanvas', () => {
  it('блок становится корнем в точке с шириной, на его месте — связь на него', () => {
    const doc = extractToCanvas(makeDoc(), 'a1', linkTo('a1'), TARGET)
    expectValid(doc)
    expect(childIds(findNode(doc, 'A'))).toEqual(['L', 'a2', 'a3'])
    expect(findNode(doc, 'L')).toMatchObject({ sourceId: 'a1', children: [] })
    const root = findRootEntry(doc, 'a1')
    expect(root?.canvas).toMatchObject({ x: 2000, y: 40, width: 640, height: null })
    expect(childIds(findNode(doc, 'a1'))).toEqual(['a1x', 'a1y'])
    expect(doc.roots.at(-1)?.node.id).toBe('a1')
  })

  it('свойства места и повтор уходят к связи, корень — по умолчанию', () => {
    const start = updateNode(makeDoc(), 'a2', { self: { flex: '1', width: '200px' }, repeat: 3 })
    const doc = extractToCanvas(start, 'a2', linkTo('a2'), TARGET)
    expect(findNode(doc, 'L')).toMatchObject({ self: { flex: '1', width: '200px' }, repeat: 3 })
    expect(findNode(doc, 'a2')).toMatchObject({ self: { flex: '0 1 auto' }, repeat: 1 })
    expectValid(doc)
  })

  it('связи внутри выносимого блока остаются валидными', () => {
    const start = extractToCanvas(makeDoc(), 'a1x', linkTo('a1x', 'L1'), TARGET)
    const doc = extractToCanvas(start, 'a1', linkTo('a1', 'L2'), { ...TARGET, at: { x: 3000, y: 0 } })
    expectValid(doc)
    expect(childIds(findNode(doc, 'a1'))).toEqual(['L1', 'a1y'])
    expect(childIds(findNode(doc, 'A'))[0]).toBe('L2')
  })

  it('отказы: корень, связь, чужой источник, дубль id — документ тот же', () => {
    const doc = makeDoc()
    expect(canExtractToCanvas(doc, 'A', linkTo('A'))).toBe('target-not-found')
    expect(canExtractToCanvas(doc, 'nope', linkTo('nope'))).toBe('node-not-found')
    expect(canExtractToCanvas(doc, 'a1', linkTo('a2'))).toBe('source-not-found')
    expect(canExtractToCanvas(doc, 'a1', linkTo('a1', 'a2'))).toBe('duplicate-id')
    const withLink = extractToCanvas(doc, 'a2', linkTo('a2'), TARGET)
    expect(canExtractToCanvas(withLink, 'L', linkTo('L', 'L9'))).toBe('link-to-canvas')
    expect(extractToCanvas(doc, 'A', linkTo('A'), TARGET)).toBe(doc)
  })
})
