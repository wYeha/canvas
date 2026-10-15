/** Тесты действий над блоком: доступность с причиной и цели перемещения (выше, ниже, на канвас). */
import { describe, expect, it } from 'vitest'
import { moveTargetFor, nodeActionStates, toCanvasTarget } from '@/scripts/pages/canvas/node-actions'
import { DUPLICATE_ROOT_GAP, NODE_ACTION_REASONS } from '@/scripts/pages/canvas/constants'
import { moveNode } from '@/scripts/pages/canvas/tree'
import { childIds, expectValid, makeDoc } from './tree-fixture'

/** Состояние действия по id узла в свежей фикстуре. */
function state(nodeId: string, action: string) {
  return nodeActionStates(makeDoc(), nodeId).find((s) => s.id === action)
}

/** Цель перемещения, которая обязана существовать. */
function mustTarget(target: ReturnType<typeof moveTargetFor>) {
  if (target === null) throw new Error('ожидалась цель перемещения')
  return target
}

describe('nodeActionStates', () => {
  it('пусто для несуществующего узла', () => {
    expect(nodeActionStates(makeDoc(), 'nope')).toEqual([])
  })

  it('первый ребёнок: «выше» недоступно с причиной, «ниже» доступно', () => {
    expect(state('a1', 'move-up')).toMatchObject({ disabled: true, reason: NODE_ACTION_REASONS.first })
    expect(state('a1', 'move-down')).toMatchObject({ disabled: false, reason: null })
  })

  it('последний ребёнок (связь): «ниже» недоступно', () => {
    expect(state('linkB', 'move-down')).toMatchObject({ disabled: true, reason: NODE_ACTION_REASONS.last })
  })

  it('корни: крайние недоступны в своём направлении', () => {
    expect(state('A', 'move-up')?.disabled).toBe(true)
    expect(state('B', 'move-up')?.disabled).toBe(false)
    expect(state('C', 'move-down')?.disabled).toBe(true)
  })

  it('«На канвас»: вложенный блок доступен, корень и связь нет', () => {
    expect(state('a1', 'to-canvas')?.disabled).toBe(false)
    expect(state('A', 'to-canvas')).toMatchObject({ disabled: true, reason: NODE_ACTION_REASONS.alreadyRoot })
    expect(state('linkB', 'to-canvas')).toMatchObject({ disabled: true, reason: NODE_ACTION_REASONS.linkToCanvas })
  })

  it('дублировать и удалить доступны всегда', () => {
    for (const id of ['A', 'a1', 'linkB']) {
      expect(state(id, 'duplicate')?.disabled).toBe(false)
      expect(state(id, 'delete')?.disabled).toBe(false)
    }
  })
})

describe('moveTargetFor', () => {
  it('«ниже» ребёнка меняет его с соседом', () => {
    const doc = makeDoc()
    const next = moveNode(doc, 'a1', mustTarget(moveTargetFor(doc, 'a1', 1)))
    expect(childIds(next.roots[0]?.node)).toEqual(['a2', 'a1', 'linkB'])
    expectValid(next)
  })

  it('«выше» ребёнка меняет его с предыдущим соседом', () => {
    const doc = makeDoc()
    const next = moveNode(doc, 'linkB', mustTarget(moveTargetFor(doc, 'linkB', -1)))
    expect(childIds(next.roots[0]?.node)).toEqual(['a1', 'linkB', 'a2'])
  })

  it('«ниже» корня меняет порядок roots, не двигая его по полю', () => {
    const doc = makeDoc()
    const next = moveNode(doc, 'A', mustTarget(moveTargetFor(doc, 'A', 1)))
    expect(next.roots.map((r) => r.node.id)).toEqual(['B', 'A', 'C'])
    expect(next.roots[1]?.canvas).toEqual(doc.roots[0]?.canvas)
    expectValid(next)
  })

  it('«выше» корня', () => {
    const doc = makeDoc()
    const next = moveNode(doc, 'C', mustTarget(moveTargetFor(doc, 'C', -1)))
    expect(next.roots.map((r) => r.node.id)).toEqual(['A', 'C', 'B'])
  })

  it('на краю перемещение ничего не меняет', () => {
    const doc = makeDoc()
    expect(moveNode(doc, 'a1', mustTarget(moveTargetFor(doc, 'a1', -1)))).toBe(doc)
    expect(moveNode(doc, 'linkB', mustTarget(moveTargetFor(doc, 'linkB', 1)))).toBe(doc)
    expect(moveNode(doc, 'A', mustTarget(moveTargetFor(doc, 'A', -1)))).toBe(doc)
    expect(moveNode(doc, 'C', mustTarget(moveTargetFor(doc, 'C', 1)))).toBe(doc)
  })

  it('несуществующий узел — null', () => {
    expect(moveTargetFor(makeDoc(), 'nope', 1)).toBeNull()
  })
})

describe('toCanvasTarget', () => {
  it('вложенный блок встаёт правее своего корня на его уровне', () => {
    const doc = makeDoc()
    const target = toCanvasTarget(doc, 'a1x')
    expect(target).toEqual({ type: 'canvas', at: { x: 1440 + DUPLICATE_ROOT_GAP, y: 0 } })
    const next = moveNode(doc, 'a1x', mustTarget(target))
    expect(next.roots.at(-1)?.node.id).toBe('a1x')
    expect(next.roots.at(-1)?.canvas.width).toBe(1440)
    expectValid(next)
  })

  it('корень, связь и несуществующий узел — null', () => {
    const doc = makeDoc()
    expect(toCanvasTarget(doc, 'A')).toBeNull()
    expect(toCanvasTarget(doc, 'linkB')).toBeNull()
    expect(toCanvasTarget(doc, 'nope')).toBeNull()
  })
})
