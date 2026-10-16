/** Тесты копирования узла в цель drop (Alt при отпускании). */
import { describe, expect, it } from 'vitest'
import type { MoveTarget } from '@/scripts/pages/canvas/tree-types'
import { copyNodeToTarget } from '@/scripts/pages/canvas/tree-copy'
import { findNode, findRootEntry } from '@/scripts/pages/canvas/tree-query'
import { childIds, expectValid, makeDoc } from '@/scripts/pages/canvas/__tests__/tree-fixture'

/** Цель «ребёнком блока» для тестов. */
function child(parentId: string, index: number): MoveTarget {
  return { type: 'child', parentId, index }
}

describe('copyNodeToTarget', () => {
  it('копирует ребёнка в другой блок, исходник остаётся', () => {
    const doc = makeDoc()
    const { document: next, copyId } = copyNodeToTarget(doc, 'a2', child('a1', 0))
    expectValid(next)
    expect(copyId).not.toBe('a2')
    expect(childIds(findNode(doc, 'A'))).toEqual(['a1', 'a2', 'linkB'])
    expect(childIds(findNode(next, 'a1'))).toEqual([copyId, 'a1x', 'a1y'])
    expect(findNode(next, 'a2')).toBe(findNode(doc, 'a2'))
  })

  it('копирует вложенный блок на канвас новым корнем', () => {
    const doc = makeDoc()
    const { document: next, copyId } = copyNodeToTarget(doc, 'a1', { type: 'canvas', at: { x: 100, y: 200 } })
    expectValid(next)
    expect(copyId).not.toBeNull()
    expect(copyId).not.toBe('a1')
    expect(next.roots).toHaveLength(4)
    if (copyId === null) return
    expect(findRootEntry(next, copyId)?.canvas).toMatchObject({ x: 100, y: 200, width: 1440 })
    expect(childIds(findNode(doc, 'A'))).toEqual(['a1', 'a2', 'linkB'])
  })

  it('отказывает при canMoveNode', () => {
    const doc = makeDoc()
    expect(copyNodeToTarget(doc, 'B', child('c1', 0))).toEqual({ document: doc, copyId: null })
    expect(copyNodeToTarget(doc, 'linkB', { type: 'canvas', at: { x: 0, y: 0 } })).toEqual({
      document: doc,
      copyId: null,
    })
  })

  it('no-op на том же месте, что и перенос', () => {
    const doc = makeDoc()
    expect(copyNodeToTarget(doc, 'a2', child('A', 1))).toEqual({ document: doc, copyId: null })
    expect(copyNodeToTarget(doc, 'B', { type: 'canvas', at: { x: 2000, y: 0 } })).toEqual({
      document: doc,
      copyId: null,
    })
  })

  it('копия в того же родителя на другую позицию увеличивает число детей', () => {
    const doc = makeDoc()
    const { document: next, copyId } = copyNodeToTarget(doc, 'a2', child('A', 0))
    expectValid(next)
    expect(copyId).not.toBeNull()
    expect(childIds(findNode(next, 'A'))).toEqual([copyId, 'a1', 'a2', 'linkB'])
  })
})
