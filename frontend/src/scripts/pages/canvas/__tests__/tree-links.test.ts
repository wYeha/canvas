/** Тесты правил дерева для связей: добавление, перенос, копирование, удаление корня-источника, вставка. */
import { describe, expect, it } from 'vitest'
import type { LayoutDocument, LayoutNode } from '@shared'
import { createLinkBlock } from '@/scripts/pages/canvas/factories'
import {
  addChild,
  addRoot,
  canAddChild,
  canAddRoot,
  canMoveNode,
  cloneSubtree,
  duplicateNode,
  findNode,
  moveNode,
  removeNode,
  type MoveTarget,
} from '@/scripts/pages/canvas/tree'
import { copyNodeToTarget } from '@/scripts/pages/canvas/tree-copy'
import { withoutDanglingLinks } from '@/scripts/pages/canvas/tree-internal'
import { block, childIds, deepFreeze, expectValid, makeDoc } from './tree-fixture'

/** Блок-связь с заданным id на корень `sourceId`. */
function linkTo(id: string, sourceId: string): LayoutNode {
  return { ...createLinkBlock(sourceId), id }
}

/** Цель «ребёнком блока». */
function child(parentId: string, index: number): MoveTarget {
  return { type: 'child', parentId, index }
}

/** Цель «на канвас». */
const CANVAS: MoveTarget = { type: 'canvas', at: { x: 0, y: 900 } }

/**
 * Документ фикстуры со связями: в a2 (корень A) связь lC на C, в b1 (корень B) связь lA на A.
 * Граф корней: A → C, B → A.
 */
function linkedDoc(): LayoutDocument {
  const base = makeDoc()
  const withC = addChild(base, 'a2', linkTo('lC', 'C'))
  const doc = addChild(withC, 'b1', linkTo('lA', 'A'))
  expectValid(doc)
  return deepFreeze(doc)
}

describe('добавление', () => {
  it('связь встаёт в блок другого корня без цикла', () => {
    expect(childIds(findNode(linkedDoc(), 'a2'))).toEqual(['lC'])
  })

  it('внутрь связи ничего не кладётся', () => {
    const doc = linkedDoc()
    expect(canAddChild(doc, 'lC', block('x', 'flex'))).toBe('target-is-link')
    expect(addChild(doc, 'lC', block('x', 'flex'))).toBe(doc)
  })

  it('цикл: связь в свой источник, во включающий корень и через цепочку', () => {
    const doc = linkedDoc()
    expect(canAddChild(doc, 'c1', linkTo('n', 'C'))).toBe('link-cycle')
    expect(canAddChild(doc, 'c1', linkTo('n', 'A'))).toBe('link-cycle')
    expect(canAddChild(doc, 'c1', linkTo('n', 'B'))).toBe('link-cycle')
    expect(canAddChild(doc, 'a1', linkTo('n', 'B'))).toBe('link-cycle')
  })

  it('связь на несуществующий корень и на вложенный блок — source-not-found', () => {
    const doc = linkedDoc()
    expect(canAddChild(doc, 'c1', linkTo('n', 'nope'))).toBe('source-not-found')
    expect(canAddChild(doc, 'c1', linkTo('n', 'a1'))).toBe('source-not-found')
  })

  it('поддерево со связью проверяется целиком', () => {
    const doc = linkedDoc()
    const sub = block('s', 'flex', [linkTo('n', 'A')])
    expect(canAddChild(doc, 'c1', sub)).toBe('link-cycle')
    expect(canAddChild(doc, 'a1', block('s2', 'flex', [linkTo('n2', 'C')]))).toBeNull()
  })

  it('корень не может быть связью; новый корень со связью на себя — цикл', () => {
    const doc = linkedDoc()
    expect(canAddRoot(doc, linkTo('n', 'A'))).toBe('link-to-canvas')
    expect(canAddRoot(doc, block('R', 'flex', [linkTo('n', 'R')]))).toBe('link-cycle')
    const root = block('R', 'flex', [linkTo('n', 'A')])
    const next = addRoot(doc, { canvas: { x: 0, y: 0, width: 100, height: null, exportMaxWidth: false }, node: root })
    expectValid(next)
  })
})

describe('удаление', () => {
  it('удаление корня-источника удаляет все связи на него одним шагом', () => {
    const next = removeNode(linkedDoc(), 'C')
    expectValid(next)
    expect(findNode(next, 'lC')).toBeUndefined()
    expect(findNode(next, 'lA')).toBeDefined()
  })

  it('удаление вложенного блока и самой связи связи других корней не трогает', () => {
    const doc = linkedDoc()
    const next = removeNode(doc, 'lC')
    expectValid(next)
    expect(findNode(next, 'lA')).toBeDefined()
    expect(removeNode(doc, 'a1').roots[1]).toBe(doc.roots[1])
  })
})

describe('перенос', () => {
  it('в связь нельзя', () => {
    expect(canMoveNode(linkedDoc(), 'a3', child('lC', 0))).toBe('target-is-link')
  })

  it('корень-источник нельзя вложить в блок, обычный корень — можно', () => {
    const doc = linkedDoc()
    expect(canMoveNode(doc, 'C', child('a1', 0))).toBe('source-into-block')
    // B содержит связь на A, а A включает C: B внутри C замкнул бы цикл C → A → C
    expect(canMoveNode(doc, 'B', child('c1', 0))).toBe('link-cycle')
    const placement = { x: 0, y: 900, width: 100, height: null, exportMaxWidth: false }
    const withD = addRoot(doc, { canvas: placement, node: block('D', 'flex') })
    expect(canMoveNode(withD, 'D', child('c1', 0))).toBeNull()
    expectValid(moveNode(withD, 'D', child('c1', 0)))
  })

  it('связь не становится корнем, блок со связью — становится', () => {
    const doc = linkedDoc()
    expect(canMoveNode(doc, 'lC', CANVAS)).toBe('link-to-canvas')
    const next = moveNode(doc, 'a2', CANVAS)
    expectValid(next)
    expect(next.roots.at(-1)?.node.id).toBe('a2')
  })

  it('перенос связи или блока со связью в корень, который источник включает, — цикл', () => {
    const doc = linkedDoc()
    expect(canMoveNode(doc, 'lA', child('c1', 0))).toBe('link-cycle')
    expect(canMoveNode(doc, 'lA', child('a1', 0))).toBe('link-cycle')
    expect(canMoveNode(doc, 'lC', child('b1', 0))).toBeNull()
    expectValid(moveNode(doc, 'lC', child('b1', 0)))
  })

  it('перестановка связи внутри того же родителя допустима', () => {
    const doc = addChild(linkedDoc(), 'a2', block('z', 'flex'))
    const next = moveNode(doc, 'z', child('a2', 0))
    expect(childIds(findNode(next, 'a2'))).toEqual(['z', 'lC'])
  })
})

describe('копирование и дублирование', () => {
  it('копия корня-источника встаёт в блок: исходник остаётся корнем, связи на месте', () => {
    const { document: next, copyId } = copyNodeToTarget(linkedDoc(), 'C', child('a1', 0))
    expect(copyId).not.toBeNull()
    expectValid(next)
  })

  it('копия связи в корень, который источник включает, отклоняется', () => {
    expect(copyNodeToTarget(linkedDoc(), 'lA', child('c1', 0)).copyId).toBeNull()
  })

  it('дублирование связи и корня со связью сохраняет источник', () => {
    const doc = linkedDoc()
    const dupLink = duplicateNode(doc, 'lC')
    expectValid(dupLink.document)
    expect(findNode(dupLink.document, dupLink.copyId ?? '')?.sourceId).toBe('C')
    expectValid(duplicateNode(doc, 'A').document)
  })

  it('клон связи сохраняет источник', () => {
    expect(cloneSubtree(linkTo('l', 'C')).sourceId).toBe('C')
  })
})

describe('withoutDanglingLinks', () => {
  it('убирает из поддерева связи на корни, которых нет в документе; остальное — те же ссылки', () => {
    const kept = { ...createLinkBlock('B'), id: 'lB' }
    const gone = { ...createLinkBlock('X'), id: 'lX' }
    const node = block('n', 'flex', [kept, block('m', 'flex', [gone])])
    const result = withoutDanglingLinks(node, makeDoc())
    expect(childIds(result)).toEqual(['lB', 'm'])
    expect(childIds(result.children[1])).toEqual([])
    expect(result.children[0]).toBe(kept)
    const clean = block('k', 'flex', [kept])
    expect(withoutDanglingLinks(clean, makeDoc())).toBe(clean)
  })
})
