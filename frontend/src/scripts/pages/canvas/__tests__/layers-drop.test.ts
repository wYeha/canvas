/** Тесты перетаскивания в «Слоях»: зоны строки, цели переноса и линия вставки. */
import { describe, expect, it } from 'vitest'
import {
  layerDropLineRect,
  layerDropZone,
  layersDropAllowed,
  layersMoveTarget,
} from '@/scripts/pages/canvas/layers-drop'
import { moveNode } from '@/scripts/pages/canvas/tree'
import { findNode } from '@/scripts/pages/canvas/tree-query'
import { childIds, expectValid, makeDoc } from './tree-fixture'

/** Цель переноса, которая обязана существовать. */
function mustTarget(target: ReturnType<typeof layersMoveTarget>) {
  if (target === null) throw new Error('ожидалась цель переноса')
  return target
}

describe('layerDropZone', () => {
  const h = 30

  it('трети: до, внутрь [h/3, 2h/3), после', () => {
    expect(layerDropZone(0, h)).toBe('before')
    expect(layerDropZone(h / 3 - 0.01, h)).toBe('before')
    expect(layerDropZone(h / 3, h)).toBe('inside')
    expect(layerDropZone(h / 2, h)).toBe('inside')
    expect(layerDropZone((2 * h) / 3 - 0.01, h)).toBe('inside')
    expect(layerDropZone((2 * h) / 3, h)).toBe('after')
    expect(layerDropZone(h, h)).toBe('after')
  })
})

describe('layersMoveTarget', () => {
  it('перестановка a1 и a2 внутри A', () => {
    const doc = makeDoc()
    const target = layersMoveTarget(doc, 'a2', 'a1', 'before')
    expect(target).toEqual({ type: 'child', parentId: 'A', index: 0 })
    const next = moveNode(doc, 'a2', mustTarget(target))
    expect(childIds(next.roots[0]?.node)).toEqual(['a2', 'a1', 'a3'])
    expectValid(next)
  })

  it('вынос a1x после корня B', () => {
    const doc = makeDoc()
    const target = layersMoveTarget(doc, 'a1x', 'B', 'after')
    expect(target).toMatchObject({ type: 'canvas', rootIndex: 2 })
    const next = moveNode(doc, 'a1x', mustTarget(target))
    expect(next.roots.map((r) => r.node.id)).toEqual(['A', 'B', 'a1x', 'C'])
    expectValid(next)
  })

  it('перестановка корней A и C', () => {
    const doc = makeDoc()
    const target = layersMoveTarget(doc, 'C', 'A', 'before')
    expect(target).toMatchObject({ type: 'canvas', rootIndex: 0 })
    const next = moveNode(doc, 'C', mustTarget(target))
    expect(next.roots.map((r) => r.node.id)).toEqual(['C', 'A', 'B'])
    expectValid(next)
  })

  it('запрет в себя и в потомка', () => {
    const doc = makeDoc()
    expect(layersMoveTarget(doc, 'A', 'A', 'inside')).toBeNull()
    expect(layersMoveTarget(doc, 'A', 'a1', 'before')).toBeNull()
    expect(layersDropAllowed(doc, 'a1', 'a1x', 'inside')).toBe(false)
  })

  it('внутрь листа можно: становится его первым ребёнком', () => {
    const doc = makeDoc()
    expect(layersMoveTarget(doc, 'a2', 'a3', 'inside')).toEqual({ type: 'child', parentId: 'a3', index: 0 })
  })

  it('внутрь grid-блока a1', () => {
    const doc = makeDoc()
    const target = layersMoveTarget(doc, 'a2', 'a1', 'inside')
    expect(target).toEqual({ type: 'child', parentId: 'a1', index: 2 })
    const next = moveNode(doc, 'a2', mustTarget(target))
    const a1 = findNode(next, 'a1')
    expect(childIds(a1)).toEqual(['a1x', 'a1y', 'a2'])
    expectValid(next)
  })

  it('то же место — документ не меняется', () => {
    const doc = makeDoc()
    expect(layersMoveTarget(doc, 'a2', 'a2', 'after')).toBeNull()
    const noop = layersMoveTarget(doc, 'a2', 'a1', 'after')
    expect(noop).toEqual({ type: 'child', parentId: 'A', index: 1 })
    expect(moveNode(doc, 'a2', mustTarget(noop))).toBe(doc)
  })
})

describe('layerDropLineRect', () => {
  it('отступ слева по глубине, линия на верхней или нижней границе строки', () => {
    const row = { x: 100, y: 200, width: 240, height: 32 }
    const before = layerDropLineRect(row, 'before', 1)
    expect(before.x).toBe(100 + 18 + 12)
    expect(before.y).toBe(200)
    const after = layerDropLineRect(row, 'after', 0)
    expect(after.y).toBe(200 + 32 - 2)
    expect(after.x).toBe(100 + 18)
  })
})
