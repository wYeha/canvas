/** Тесты выбора приёмника: прозрачность перетаскиваемого поддерева и плашек связей, пустое поле, устаревшие id. */
import { describe, expect, it } from 'vitest'
import { resolveDropTarget, resolveLinkTarget, sameDropTarget } from '@/scripts/pages/canvas/dnd/drop-target'
import { makeDoc } from '@/scripts/pages/canvas/__tests__/tree-fixture'
import { createLinkBlock } from '@/scripts/pages/canvas/factories'
import { addChild } from '@/scripts/pages/canvas/tree'

const doc = makeDoc()

describe('resolveDropTarget', () => {
  it('курсор не над поверхностью поля — приёмника нет', () => {
    expect(resolveDropTarget(doc, 'a2', null)).toBeNull()
  })

  it('пустое поле: блок становится корнем', () => {
    expect(resolveDropTarget(doc, 'a2', { chain: [] })).toEqual({ kind: 'canvas' })
  })

  it('самый глубокий блок под курсором — приёмник, в том числе в другом корне', () => {
    expect(resolveDropTarget(doc, 'a2', { chain: ['a1x', 'a1', 'A'] })).toEqual({
      kind: 'block',
      id: 'a1x',
      index: null,
    })
    expect(resolveDropTarget(doc, 'a2', { chain: ['c1', 'C'] })).toEqual({ kind: 'block', id: 'c1', index: null })
  })

  it('лист под курсором — приёмник сам лист', () => {
    expect(resolveDropTarget(doc, 'a2', { chain: ['a3', 'A'] })).toEqual({ kind: 'block', id: 'a3', index: null })
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

  it('корень над блоком другого корня — приёмник этот блок', () => {
    expect(resolveDropTarget(doc, 'B', { chain: ['c1', 'C'] })).toEqual({ kind: 'block', id: 'c1', index: null })
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

describe('плашка связи прозрачна', () => {
  it('над плашкой приёмник — её родитель', () => {
    const doc = addChild(makeDoc(), 'a2', { ...createLinkBlock('C'), id: 'lC' })
    expect(resolveDropTarget(doc, 'a3', { chain: ['lC', 'a2', 'A'] })).toEqual({ kind: 'block', id: 'a2', index: null })
  })
})

describe('resolveLinkTarget', () => {
  const linked = addChild(makeDoc(), 'a2', { ...createLinkBlock('C'), id: 'lC' })

  it('допустимый блок — цель', () => {
    expect(resolveLinkTarget(linked, 'B', { chain: ['a1x', 'a1', 'A'] })).toEqual({
      target: { kind: 'block', id: 'a1x', index: null },
      deniedId: null,
    })
  })

  it('свой корень или цикл — отказ с id блока', () => {
    expect(resolveLinkTarget(linked, 'C', { chain: ['c1', 'C'] })).toEqual({ target: null, deniedId: 'c1' })
    expect(resolveLinkTarget(linked, 'A', { chain: ['c1', 'C'] })).toEqual({ target: null, deniedId: 'c1' })
  })

  it('над плашкой — её родитель; поле и панели — ничего', () => {
    expect(resolveLinkTarget(linked, 'B', { chain: ['lC', 'a2', 'A'] }).target).toMatchObject({ id: 'a2' })
    expect(resolveLinkTarget(linked, 'B', { chain: [] })).toEqual({ target: null, deniedId: null })
    expect(resolveLinkTarget(linked, 'B', null)).toEqual({ target: null, deniedId: null })
  })
})

describe('resolveDropTarget: копия корня-источника', () => {
  it('переносить корень-источник в блок нельзя, копировать (Alt) — можно', () => {
    const doc = addChild(makeDoc(), 'a2', { ...createLinkBlock('C'), id: 'lC' })
    expect(resolveDropTarget(doc, 'C', { chain: ['b1', 'B'] })).toBeNull()
    expect(resolveDropTarget(doc, 'C', { chain: ['b1', 'B'] }, true)).toEqual({ kind: 'block', id: 'b1', index: null })
  })
})
