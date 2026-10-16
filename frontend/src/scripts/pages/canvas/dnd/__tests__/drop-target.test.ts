/** Тесты выбора приёмника: прозрачность перетаскиваемого поддерева, плашки связи, пустое поле, запреты переноса. */
import { describe, expect, it } from 'vitest'
import { resolveDropTarget, sameDropTarget } from '@/scripts/pages/canvas/dnd/drop-target'
import { makeDoc } from '@/scripts/pages/canvas/__tests__/tree-fixture'

const doc = makeDoc()

describe('resolveDropTarget', () => {
  it('курсор не над поверхностью поля — приёмника нет', () => {
    expect(resolveDropTarget(doc, 'a2', null)).toBeNull()
  })

  it('пустое поле: блок становится корнем, плашку связи на поле вынести нельзя', () => {
    expect(resolveDropTarget(doc, 'a2', { chain: [] })).toEqual({ kind: 'canvas' })
    expect(resolveDropTarget(doc, 'linkB', { chain: [] })).toBeNull()
  })

  it('самый глубокий блок под курсором — приёмник, в том числе в другом корне', () => {
    expect(resolveDropTarget(doc, 'a2', { chain: ['a1x', 'a1', 'A'] })).toEqual({
      kind: 'block',
      id: 'a1x',
      index: null,
    })
    expect(resolveDropTarget(doc, 'a2', { chain: ['c1', 'C'] })).toEqual({ kind: 'block', id: 'c1', index: null })
  })

  it('плашка связи под курсором — приёмник её ближайший блок-предок', () => {
    expect(resolveDropTarget(doc, 'a2', { chain: ['linkB', 'A'] })).toEqual({ kind: 'block', id: 'A', index: null })
  })

  it('перетаскиваемое поддерево прозрачно: над собой и над потомком — родитель', () => {
    expect(resolveDropTarget(doc, 'a1', { chain: ['a1', 'A'] })).toEqual({ kind: 'block', id: 'A', index: null })
    expect(resolveDropTarget(doc, 'a1', { chain: ['a1x', 'a1', 'A'] })).toEqual({ kind: 'block', id: 'A', index: null })
  })

  it('корень, которого тянут за тело, над собой и над своим заголовком — пустое поле', () => {
    expect(resolveDropTarget(doc, 'C', { chain: ['c1', 'C'] })).toEqual({ kind: 'canvas' })
    expect(resolveDropTarget(doc, 'C', { chain: ['C'] })).toEqual({ kind: 'canvas' })
  })

  it('заголовок другого корня — приёмник сам этот корень', () => {
    expect(resolveDropTarget(doc, 'a2', { chain: ['C'] })).toEqual({ kind: 'block', id: 'C', index: null })
  })

  it('корень-источник связи: над блоком нельзя, над пустым полем — можно', () => {
    expect(resolveDropTarget(doc, 'B', { chain: ['c1', 'C'] })).toBeNull()
    expect(resolveDropTarget(doc, 'B', { chain: [] })).toEqual({ kind: 'canvas' })
  })

  it('id, которого нет в документе (DOM ещё не обновился), пропускается', () => {
    expect(resolveDropTarget(doc, 'a2', { chain: ['gone', 'c1', 'C'] })).toEqual({
      kind: 'block',
      id: 'c1',
      index: null,
    })
    expect(resolveDropTarget(doc, 'a2', { chain: ['gone'] })).toEqual({ kind: 'canvas' })
  })
})

describe('sameDropTarget', () => {
  it('сравнивает по виду и id блока', () => {
    expect(sameDropTarget(null, null)).toBe(true)
    expect(sameDropTarget({ kind: 'canvas' }, { kind: 'canvas' })).toBe(true)
    expect(sameDropTarget({ kind: 'block', id: 'a1', index: null }, { kind: 'block', id: 'a1', index: null })).toBe(
      true,
    )
    expect(sameDropTarget({ kind: 'block', id: 'a1', index: null }, { kind: 'block', id: 'a2', index: null })).toBe(
      false,
    )
    expect(sameDropTarget({ kind: 'block', id: 'a1', index: null }, { kind: 'canvas' })).toBe(false)
    expect(sameDropTarget(null, { kind: 'canvas' })).toBe(false)
  })

  it('у одного блока сравнивает и позицию вставки', () => {
    expect(sameDropTarget({ kind: 'block', id: 'A', index: 1 }, { kind: 'block', id: 'A', index: 1 })).toBe(true)
    expect(sameDropTarget({ kind: 'block', id: 'A', index: 1 }, { kind: 'block', id: 'A', index: 2 })).toBe(false)
    expect(sameDropTarget({ kind: 'block', id: 'A', index: 0 }, { kind: 'block', id: 'A', index: null })).toBe(false)
  })
})
