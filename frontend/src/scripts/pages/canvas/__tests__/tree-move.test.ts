/** Тесты перемещения узлов: внутри родителя, между блоками и корнями, на канвас, запреты и no-op. */
import { describe, expect, it } from 'vitest'
import {
  canMoveNode,
  findNode,
  findParent,
  findRootEntry,
  moveNode,
  type MoveTarget,
} from '@/scripts/pages/canvas/tree'
import { childIds, expectValid, makeDoc } from './tree-fixture'

/** Цель «ребёнком блока». */
function child(parentId: string, index: number): MoveTarget {
  return { type: 'child', parentId, index }
}

describe('внутри одного родителя', () => {
  it('вперёд: индекс до изъятия, [x, y] → index 2 даёт [y, x]', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'a1x', child('a1', 2))
    expectValid(result)
    expect(childIds(findNode(result, 'a1'))).toEqual(['a1y', 'a1x'])
  })

  it('назад', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'a3', child('A', 0))
    expectValid(result)
    expect(childIds(findNode(result, 'A'))).toEqual(['a3', 'a1', 'a2'])
  })

  it('«вверх» = from − 1, «вниз» = from + 2', () => {
    const doc = makeDoc()
    expect(childIds(findNode(moveNode(doc, 'a2', child('A', 0)), 'A'))).toEqual(['a2', 'a1', 'a3'])
    expect(childIds(findNode(moveNode(doc, 'a2', child('A', 3)), 'A'))).toEqual(['a1', 'a3', 'a2'])
  })

  it('на своё же место (index = from и from + 1) → тот же doc', () => {
    const doc = makeDoc()
    expect(moveNode(doc, 'a2', child('A', 1))).toBe(doc)
    expect(moveNode(doc, 'a2', child('A', 2))).toBe(doc)
  })

  it('индекс вне диапазона зажимается', () => {
    const doc = makeDoc()
    expect(childIds(findNode(moveNode(doc, 'a1', child('A', 99)), 'A'))).toEqual(['a2', 'a3', 'a1'])
    expect(childIds(findNode(moveNode(doc, 'a3', child('A', -3)), 'A'))).toEqual(['a3', 'a1', 'a2'])
  })
})

describe('между блоками', () => {
  it('в другой блок того же корня', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'a2', child('a1', 1))
    expectValid(result)
    expect(childIds(findNode(result, 'a1'))).toEqual(['a1x', 'a2', 'a1y'])
    expect(childIds(findNode(result, 'A'))).toEqual(['a1', 'a3'])
    expect(result.roots[1]).toBe(doc.roots[1])
  })

  it('из потомка в предка', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'a1x', child('A', 0))
    expectValid(result)
    expect(childIds(findNode(result, 'A'))).toEqual(['a1x', 'a1', 'a2', 'a3'])
  })

  it('в блок другого корня (C.c1 → A.a1)', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'c1', child('a1', 0))
    expectValid(result)
    expect(childIds(findNode(result, 'a1'))).toEqual(['c1', 'a1x', 'a1y'])
    expect(childIds(findNode(result, 'C'))).toEqual([])
    expect(result.roots[1]).toBe(doc.roots[1])
  })

  it('self сохраняется при переносе', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'a3', child('b1', 0))
    expect(findNode(result, 'a3')?.self).toBe(findNode(doc, 'a3')?.self)
  })
})

describe('между корнями', () => {
  it('вложенный блок в блок другого корня → ок', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'a3', child('c1', 0))
    expectValid(result)
    expect(findParent(result, 'a3')?.id).toBe('c1')
  })

  it('любой корень можно вложить в блок другого корня', () => {
    const doc = makeDoc()
    expect(canMoveNode(doc, 'B', child('c1', 0))).toBeNull()
    const result = moveNode(doc, 'B', child('c1', 0))
    expectValid(result)
    expect(findParent(result, 'B')?.id).toBe('c1')
  })
})

describe('запреты', () => {
  it('в себя и в потомка → into-self-or-descendant', () => {
    const doc = makeDoc()
    expect(canMoveNode(doc, 'a1', child('a1', 0))).toBe('into-self-or-descendant')
    expect(canMoveNode(doc, 'A', child('a1x', 0))).toBe('into-self-or-descendant')
    expect(moveNode(doc, 'a1', child('a1x', 0))).toBe(doc)
  })

  it('несуществующие узел и цель → тот же doc', () => {
    const doc = makeDoc()
    expect(canMoveNode(doc, 'нет', child('a1', 0))).toBe('node-not-found')
    expect(canMoveNode(doc, 'a2', child('нет', 0))).toBe('target-not-found')
    expect(moveNode(doc, 'нет', child('a1', 0))).toBe(doc)
    expect(moveNode(doc, 'a2', child('нет', 0))).toBe(doc)
    expect(moveNode(doc, 'нет', { type: 'canvas', at: { x: 0, y: 0 } })).toBe(doc)
  })
})

describe('корень в блок', () => {
  it('корень C в a1: пропал из roots, стал ребёнком без canvas', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'C', child('a1', 2))
    expectValid(result)
    expect(result.roots.map((root) => root.node.id)).toEqual(['A', 'B'])
    expect(childIds(findNode(result, 'a1'))).toEqual(['a1x', 'a1y', 'C'])
    expect(findNode(result, 'C')).toBe(doc.roots[2]?.node)
    expect(findNode(result, 'C')).not.toHaveProperty('canvas')
  })

  it('корень раньше корня-цели в roots (A → C.c1): индекс цели сдвигается после изъятия', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'A', child('c1', 0))
    expectValid(result)
    expect(result.roots.map((root) => root.node.id)).toEqual(['B', 'C'])
    expect(childIds(findNode(result, 'c1'))).toEqual(['A'])
    expect(findParent(result, 'a3')?.id).toBe('A')
    expect(result.roots[0]).toBe(doc.roots[1])
  })
})

describe('на канвас', () => {
  it('вложенный блок без width получает ширину корня-источника', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'a1', { type: 'canvas', at: { x: 100, y: 200 } })
    expectValid(result)
    expect(result.roots.map((root) => root.node.id)).toEqual(['A', 'B', 'C', 'a1'])
    expect(findRootEntry(result, 'a1')?.canvas).toEqual({
      x: 100,
      y: 200,
      width: 1440,
      height: null,
      exportMaxWidth: false,
    })
    expect(childIds(findNode(result, 'A'))).toEqual(['a2', 'a3'])
  })

  it('из корня с height/exportMaxWidth они не наследуются', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'b1', { type: 'canvas', at: { x: 0, y: 0 } })
    expectValid(result)
    expect(findRootEntry(result, 'b1')?.canvas).toEqual({ x: 0, y: 0, width: 480, height: null, exportMaxWidth: false })
  })

  it('с width и rootIndex', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'a1', { type: 'canvas', at: { x: 1, y: 2 }, width: 600, rootIndex: 1 })
    expectValid(result)
    expect(result.roots.map((root) => root.node.id)).toEqual(['A', 'a1', 'B', 'C'])
    expect(findRootEntry(result, 'a1')?.canvas.width).toBe(600)
  })

  it('width <= 0 → ширина корня-источника', () => {
    const doc = makeDoc()
    const target: MoveTarget = { type: 'canvas', at: { x: 0, y: 0 }, width: 0 }
    expect(canMoveNode(doc, 'a1', target)).toBeNull()
    const result = moveNode(doc, 'a1', target)
    expectValid(result)
    expect(findRootEntry(result, 'a1')?.canvas.width).toBe(1440)
    const root = moveNode(doc, 'B', { type: 'canvas', at: { x: 1, y: 1 }, width: -5 })
    expectValid(root)
    expect(findRootEntry(root, 'B')?.canvas.width).toBe(480)
  })

  it('rootIndex вне диапазона зажимается', () => {
    const doc = makeDoc()
    const atEnd = moveNode(doc, 'a1', { type: 'canvas', at: { x: 0, y: 0 }, rootIndex: 99 })
    expect(atEnd.roots.map((root) => root.node.id)).toEqual(['A', 'B', 'C', 'a1'])
    const atStart = moveNode(doc, 'a1', { type: 'canvas', at: { x: 0, y: 0 }, rootIndex: -1 })
    expect(atStart.roots.map((root) => root.node.id)).toEqual(['a1', 'A', 'B', 'C'])
    const rootToStart = moveNode(doc, 'C', { type: 'canvas', at: { x: 0, y: 0 }, rootIndex: -1 })
    expectValid(rootToStart)
    expect(rootToStart.roots.map((root) => root.node.id)).toEqual(['C', 'A', 'B'])
  })

  it('последний корень с rootIndex 99 на том же месте → тот же doc', () => {
    const doc = makeDoc()
    expect(moveNode(doc, 'C', { type: 'canvas', at: { x: 3000, y: 0 }, rootIndex: 99 })).toBe(doc)
  })

  it('корень: меняются x/y, height/exportMaxWidth сохраняются, место в roots прежнее', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'B', { type: 'canvas', at: { x: 5, y: 6 } })
    expectValid(result)
    expect(result.roots.map((root) => root.node.id)).toEqual(['A', 'B', 'C'])
    expect(result.roots[1]?.canvas).toEqual({ x: 5, y: 6, width: 480, height: 300, exportMaxWidth: true })
    expect(result.roots[1]?.node).toBe(doc.roots[1]?.node)
  })

  it('корень: rootIndex переставляет', () => {
    const doc = makeDoc()
    const result = moveNode(doc, 'A', { type: 'canvas', at: { x: 0, y: 0 }, rootIndex: 2 })
    expectValid(result)
    expect(result.roots.map((root) => root.node.id)).toEqual(['B', 'C', 'A'])
  })

  it('корень на то же место → тот же doc', () => {
    const doc = makeDoc()
    expect(moveNode(doc, 'B', { type: 'canvas', at: { x: 2000, y: 0 } })).toBe(doc)
    expect(moveNode(doc, 'B', { type: 'canvas', at: { x: 2000, y: 0 }, width: 480, rootIndex: 1 })).toBe(doc)
  })
})
