/** Тесты операций над деревом: добавление, удаление, правка, дублирование и структурное разделение. */
import { describe, expect, it } from 'vitest'
import type { LayoutDocument, LayoutNode } from '@shared'
import { createLink, createRootEntry } from '@/scripts/pages/canvas/factories'
import {
  addChild,
  addRoot,
  canAddChild,
  canAddRoot,
  cloneSubtree,
  duplicateNode,
  findNode,
  findParent,
  moveNode,
  removeNode,
  updateNode,
  updateRootPlacement,
} from '@/scripts/pages/canvas/tree'
import { block, childIds, deepFreeze, expectValid, makeDoc } from './tree-fixture'

/** Собирает id всех узлов документа в порядке обхода. */
function allIds(doc: LayoutDocument): string[] {
  return doc.roots.flatMap((root) => collect(root.node))
}

/** Собирает id поддерева узла. */
function collect(node: LayoutNode | undefined): string[] {
  if (!node) return []
  return node.type === 'block' ? [node.id, ...node.children.flatMap(collect)] : [node.id]
}

describe('структурное разделение', () => {
  it('updateNode копирует только путь до узла', () => {
    const doc = makeDoc()
    const result = updateNode(doc, 'a1x', { label: 'Новая' })
    expectValid(result)
    expect(result).not.toBe(doc)
    expect(result.roots[1]).toBe(doc.roots[1])
    expect(result.roots[2]).toBe(doc.roots[2])
    expect(findNode(result, 'a2')).toBe(findNode(doc, 'a2'))
    expect(findNode(result, 'a1y')).toBe(findNode(doc, 'a1y'))
    expect(findNode(result, 'A')).not.toBe(findNode(doc, 'A'))
    expect(findNode(result, 'a1')).not.toBe(findNode(doc, 'a1'))
    expect(result.roots[0]?.canvas).toBe(doc.roots[0]?.canvas)
    expect(result.updatedAt).toBe(doc.updatedAt)
  })
})

describe('addChild', () => {
  it('в конец, по индексу и с зажатым индексом', () => {
    const doc = makeDoc()
    const atEnd = addChild(doc, 'a1', block('n1', 'flex'))
    expectValid(atEnd)
    expect(childIds(findNode(atEnd, 'a1'))).toEqual(['a1x', 'a1y', 'n1'])
    const atIndex = addChild(doc, 'a1', block('n1', 'flex'), 1)
    expect(childIds(findNode(atIndex, 'a1'))).toEqual(['a1x', 'n1', 'a1y'])
    expect(childIds(findNode(addChild(doc, 'a1', block('n1', 'flex'), 99), 'a1'))).toEqual(['a1x', 'a1y', 'n1'])
    expect(childIds(findNode(addChild(doc, 'a1', block('n1', 'flex'), -5), 'a1'))).toEqual(['n1', 'a1x', 'a1y'])
  })

  it('в связь нельзя', () => {
    const doc = makeDoc()
    expect(canAddChild(doc, 'linkB', block('n1', 'flex'))).toBe('parent-is-link')
    expect(addChild(doc, 'linkB', block('n1', 'flex'))).toBe(doc)
  })

  it('несуществующий родитель', () => {
    const doc = makeDoc()
    expect(canAddChild(doc, 'нет', block('n1', 'flex'))).toBe('target-not-found')
    expect(addChild(doc, 'нет', block('n1', 'flex'))).toBe(doc)
  })

  it('узел с существующим id → duplicate-id', () => {
    const doc = makeDoc()
    expect(canAddChild(doc, 'a1', block('a2', 'flex'))).toBe('duplicate-id')
    expect(canAddChild(doc, 'a1', block('n1', 'flex', [block('b1', 'flex')]))).toBe('duplicate-id')
    expect(addChild(doc, 'a1', block('a2', 'flex'))).toBe(doc)
  })

  it('связь на некорень → dangling-link, на корень → ок', () => {
    const doc = makeDoc()
    expect(canAddChild(doc, 'a1', createLink('b1'))).toBe('dangling-link')
    expect(addChild(doc, 'a1', createLink('b1'))).toBe(doc)
    const link = createLink('C')
    expect(canAddChild(doc, 'a1', link)).toBeNull()
    const result = addChild(doc, 'a1', link)
    expectValid(result)
    expect(findParent(result, link.id)?.id).toBe('a1')
  })

  it('связь внутри собственного источника → link-cycle', () => {
    const doc = makeDoc()
    expect(canAddChild(doc, 'B', createLink('B'))).toBe('link-cycle')
    expect(canAddChild(doc, 'b1', createLink('B'))).toBe('link-cycle')
    expect(addChild(doc, 'b1', createLink('B'))).toBe(doc)
    expect(canAddChild(doc, 'b1', block('n1', 'flex', [createLink('B')]))).toBe('link-cycle')
    expect(canAddChild(doc, 'c1', block('n1', 'flex', [createLink('B')]))).toBeNull()
  })

  it('A ↔ B: связь на A внутри B, где A уже включает B → link-cycle', () => {
    const doc = makeDoc()
    expect(canAddChild(doc, 'b1', createLink('A'))).toBe('link-cycle')
    expect(addChild(doc, 'B', createLink('A'))).toBe(doc)
  })

  it('A → B → C → A: замыкающая связь → link-cycle, остальные ок', () => {
    const doc = makeDoc()
    const bc = addChild(doc, 'b1', createLink('C'))
    expectValid(bc)
    expect(canAddChild(bc, 'c1', createLink('A'))).toBe('link-cycle')
    expect(canAddChild(bc, 'c1', block('n1', 'flex', [block('n2', 'flex', [createLink('A')])]))).toBe('link-cycle')
    expect(addChild(bc, 'c1', createLink('A'))).toBe(bc)
  })
})

describe('addRoot', () => {
  it('в конец и по индексу', () => {
    const doc = makeDoc()
    const entry = createRootEntry('flex', 'D', { x: 5, y: 5 })
    const atEnd = addRoot(doc, entry)
    expectValid(atEnd)
    expect(atEnd.roots.map((root) => root.node.id)).toEqual(['A', 'B', 'C', entry.node.id])
    const first = addRoot(doc, entry, 0)
    expect(first.roots.map((root) => root.node.id)).toEqual([entry.node.id, 'A', 'B', 'C'])
    expect(first.roots[1]).toBe(doc.roots[0])
  })

  it('дубль id → тот же doc', () => {
    const doc = makeDoc()
    const entry = createRootEntry('flex', 'D', { x: 0, y: 0 })
    expect(addRoot(doc, { ...entry, node: { ...entry.node, id: 'a1' } })).toBe(doc)
  })

  it('связь на отсутствующий корень → тот же doc', () => {
    const doc = makeDoc()
    const entry = createRootEntry('flex', 'D', { x: 0, y: 0 })
    expect(addRoot(doc, { ...entry, node: { ...entry.node, children: [createLink('нет')] } })).toBe(doc)
  })

  it('связь внутри нового корня на сам этот корень → link-cycle, тот же doc', () => {
    const doc = makeDoc()
    const entry = createRootEntry('flex', 'D', { x: 0, y: 0 })
    const self = { ...entry, node: { ...entry.node, children: [createLink(entry.node.id)] } }
    expect(canAddRoot(doc, self.node)).toBe('link-cycle')
    expect(addRoot(doc, self)).toBe(doc)
    const deep = { ...entry, node: { ...entry.node, children: [block('d1', 'flex', [createLink(entry.node.id)])] } }
    expect(canAddRoot(doc, deep.node)).toBe('link-cycle')
    expect(addRoot(doc, deep)).toBe(doc)
  })

  it('новый корень со связями на существующие корни цикла не даёт', () => {
    const doc = makeDoc()
    const entry = createRootEntry('flex', 'D', { x: 0, y: 0 })
    expect(canAddRoot(doc, { ...entry.node, children: [createLink('A'), createLink('B')] })).toBeNull()
    expect(canAddRoot(doc, { ...entry.node, children: [createLink('нет')] })).toBe('dangling-link')
  })

  it('связь на существующий корень → ок', () => {
    const doc = makeDoc()
    const entry = createRootEntry('flex', 'D', { x: 0, y: 0 })
    const result = addRoot(doc, { ...entry, node: { ...entry.node, children: [createLink('C')] } })
    expectValid(result)
    expect(result.roots).toHaveLength(4)
  })

  it('ширина <= 0 → тот же doc', () => {
    const doc = makeDoc()
    const entry = createRootEntry('flex', 'D', { x: 0, y: 0 }, 1)
    expect(addRoot(doc, { ...entry, canvas: { ...entry.canvas, width: 0 } })).toBe(doc)
    expect(addRoot(doc, { ...entry, canvas: { ...entry.canvas, width: -10 } })).toBe(doc)
  })
})

describe('removeNode', () => {
  it('вложенный блок с поддеревом', () => {
    const doc = makeDoc()
    const result = removeNode(doc, 'a1')
    expectValid(result)
    expect(childIds(findNode(result, 'A'))).toEqual(['a2', 'linkB'])
    expect(findNode(result, 'a1x')).toBeUndefined()
  })

  it('связь', () => {
    const doc = makeDoc()
    const result = removeNode(doc, 'linkB')
    expectValid(result)
    expect(childIds(findNode(result, 'A'))).toEqual(['a1', 'a2'])
  })

  it('корень-источник удаляется вместе со связями на него', () => {
    const doc = makeDoc()
    const result = removeNode(doc, 'B')
    expectValid(result)
    expect(result.roots.map((root) => root.node.id)).toEqual(['A', 'C'])
    expect(findNode(result, 'linkB')).toBeUndefined()
    expect(result.roots[1]).toBe(doc.roots[2])
    expect(findNode(result, 'a1')).toBe(findNode(doc, 'a1'))
  })

  it('корень без связей не трогает остальные корни', () => {
    const doc = makeDoc()
    const result = removeNode(doc, 'C')
    expectValid(result)
    expect(result.roots[0]).toBe(doc.roots[0])
    expect(result.roots[1]).toBe(doc.roots[1])
  })

  it('несуществующий id → тот же doc', () => {
    const doc = makeDoc()
    expect(removeNode(doc, 'нет')).toBe(doc)
  })
})

describe('updateNode', () => {
  it('self заменяется целиком: ключ можно удалить', () => {
    const doc = deepFreeze(updateNode(makeDoc(), 'a2', { self: { flex: '1', width: '50%' } }))
    const result = updateNode(doc, 'a2', { self: { flex: '1' } })
    expectValid(result)
    expect(findNode(result, 'a2')?.self).toEqual({ flex: '1' })
  })

  it('у связи можно менять только self', () => {
    const doc = makeDoc()
    const result = updateNode(doc, 'linkB', { self: { colSpan: 2 } })
    expectValid(result)
    expect(findNode(result, 'linkB')).toEqual({ id: 'linkB', type: 'link', sourceId: 'B', self: { colSpan: 2 } })
    expect(updateNode(doc, 'linkB', { label: 'x' })).toBe(doc)
    expect(updateNode(doc, 'linkB', { label: 'x', self: {} })).toBe(doc)
  })

  it('патч с равными значениями, пустой патч и чужой id → тот же doc', () => {
    const doc = makeDoc()
    expect(updateNode(doc, 'a1', { label: 'a1', repeat: 1 })).toBe(doc)
    expect(updateNode(doc, 'a1', {})).toBe(doc)
    expect(updateNode(doc, 'нет', { label: 'x' })).toBe(doc)
  })

  it('правка корня', () => {
    const doc = makeDoc()
    const result = updateNode(doc, 'B', { tag: 'main', padding: { top: 8, right: 8, bottom: 8, left: 8 } })
    expectValid(result)
    expect(findNode(result, 'B')).toMatchObject({ tag: 'main', padding: { top: 8 } })
    expect(result.roots[1]?.canvas).toBe(doc.roots[1]?.canvas)
  })
})

describe('updateRootPlacement', () => {
  it('меняет x/y, остальное сохраняет', () => {
    const doc = makeDoc()
    const result = updateRootPlacement(doc, 'B', { x: 10, y: 20 })
    expectValid(result)
    expect(result.roots[1]?.canvas).toEqual({ x: 10, y: 20, width: 480, height: 300, exportMaxWidth: true })
    expect(result.roots[1]?.node).toBe(doc.roots[1]?.node)
    expect(result.roots[0]).toBe(doc.roots[0])
  })

  it('width: 0, некорень, равные значения → тот же doc', () => {
    const doc = makeDoc()
    expect(updateRootPlacement(doc, 'B', { width: 0 })).toBe(doc)
    expect(updateRootPlacement(doc, 'b1', { x: 1 })).toBe(doc)
    expect(updateRootPlacement(doc, 'B', { x: 2000, width: 480 })).toBe(doc)
  })
})

describe('cloneSubtree', () => {
  it('новые уникальные id, структура и подписи как у оригинала', () => {
    const doc = makeDoc()
    const original = findNode(doc, 'A')
    if (original?.type !== 'block') throw new Error('нет A')
    const copy = cloneSubtree(original)
    const originalIds = collect(original)
    const copyIds = collect(copy)
    expect(new Set(copyIds).size).toBe(copyIds.length)
    expect(copyIds.some((id) => originalIds.includes(id))).toBe(false)
    expect(copy.children.map((child) => (child.type === 'block' ? child.label : child.sourceId))).toEqual([
      'a1',
      'a2',
      'B',
    ])
    expect(childIds(copy.children[0])).toHaveLength(2)
    expect(copy.label).toBe('A')
  })
})

describe('duplicateNode', () => {
  it('копия вложенного блока встаёт сразу после оригинала', () => {
    const doc = makeDoc()
    const { document, copyId } = duplicateNode(doc, 'a1')
    expectValid(document)
    const ids = childIds(findNode(document, 'A'))
    expect(ids).toEqual(['a1', copyId, 'a2', 'linkB'])
    const copy = findNode(document, copyId ?? '')
    expect(copy).toMatchObject({ type: 'block', label: 'a1' })
    expect(childIds(copy)).toHaveLength(2)
    expect(childIds(copy)).not.toContain('a1x')
    expect(document.roots[1]).toBe(doc.roots[1])
  })

  it('дубль связи: новый id, тот же sourceId', () => {
    const doc = makeDoc()
    const { document, copyId } = duplicateNode(doc, 'linkB')
    expectValid(document)
    expect(copyId).not.toBe('linkB')
    expect(findNode(document, copyId ?? '')).toMatchObject({ type: 'link', sourceId: 'B' })
    expect(childIds(findNode(document, 'A'))).toEqual(['a1', 'a2', 'linkB', copyId])
  })

  it('дубль корня-источника: новый корень справа, связи остаются на оригинале', () => {
    const doc = makeDoc()
    const { document, copyId } = duplicateNode(doc, 'B')
    expectValid(document)
    expect(document.roots.map((root) => root.node.id)).toEqual(['A', 'B', copyId, 'C'])
    expect(document.roots[2]?.canvas).toEqual({
      x: 2000 + 480 + 80,
      y: 0,
      width: 480,
      height: 300,
      exportMaxWidth: true,
    })
    expect(findNode(document, 'linkB')).toMatchObject({ sourceId: 'B' })
    expect(document.roots[0]).toBe(doc.roots[0])
  })

  it('несуществующий → тот же doc и copyId null', () => {
    const doc = makeDoc()
    expect(duplicateNode(doc, 'нет')).toEqual({ document: doc, copyId: null })
    expect(duplicateNode(doc, 'нет').document).toBe(doc)
  })
})

/** Детерминированный генератор псевдослучайных чисел (mulberry32) для воспроизводимой свёртки. */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Выполняет одну случайную операцию над документом. */
function randomStep(doc: LayoutDocument, random: () => number): LayoutDocument {
  const ids = allIds(doc)
  /** Случайный id узла документа (или отсутствующий, если документ пуст). */
  const pick = () => ids[Math.floor(random() * ids.length)] ?? 'нет'
  const index = Math.floor(random() * 5)
  switch (Math.floor(random() * 6)) {
    case 0:
      return removeNode(doc, pick())
    case 1:
      return duplicateNode(doc, pick()).document
    case 2:
      return moveNode(doc, pick(), { type: 'child', parentId: pick(), index })
    case 3:
      return moveNode(doc, pick(), { type: 'canvas', at: { x: index, y: index }, rootIndex: index })
    case 4:
      return addChild(doc, pick(), createLink(doc.roots[0]?.node.id ?? 'нет'), index)
    default:
      return addRoot(doc, createRootEntry('grid', 'R', { x: 0, y: 0 }), index)
  }
}

describe('свёртка случайных операций', () => {
  it('после каждой из 200 операций документ валиден, вход не мутируется', () => {
    const random = seededRandom(13)
    let doc = makeDoc()
    for (let step = 0; step < 200; step += 1) {
      doc = deepFreeze(randomStep(doc, random))
      expectValid(doc)
    }
  })
})
