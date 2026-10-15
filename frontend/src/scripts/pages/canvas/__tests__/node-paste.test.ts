/** Тесты вставки блока: свежие id, чистка связей на удалённые корни, отказ для осиротевшей связи. */
import { describe, expect, it } from 'vitest'
import { collectIds } from '@/scripts/pages/canvas/tree-internal'
import { createLink } from '@/scripts/pages/canvas/factories'
import { prepareForPaste } from '@/scripts/pages/canvas/node-paste'
import { block, makeDoc } from './tree-fixture'

describe('prepareForPaste', () => {
  it('все id новые, связь на существующий корень сохраняется', () => {
    const doc = makeDoc()
    const a = doc.roots[0]?.node
    if (a === undefined) throw new Error('нет корня A')
    const copy = prepareForPaste(doc, a)
    expect(copy).not.toBeNull()
    if (copy === null) return
    const before = new Set(collectIds(a))
    expect(collectIds(copy).some((id) => before.has(id))).toBe(false)
    const link = copy.type === 'block' ? copy.children.at(-1) : undefined
    expect(link?.type === 'link' ? link.sourceId : '').toBe('B')
  })

  it('связи на отсутствующие корни убираются из поддерева', () => {
    const doc = makeDoc()
    const withDangling = block('X', 'flex', [block('x1', 'flex', [createLink('gone')]), createLink('B')])
    const copy = prepareForPaste(doc, withDangling)
    const kinds = copy?.type === 'block' ? copy.children.map((c) => c.type) : []
    expect(kinds).toEqual(['block', 'link'])
    const inner = copy?.type === 'block' ? copy.children[0] : undefined
    expect(inner?.type === 'block' ? inner.children : null).toEqual([])
  })

  it('скопированная связь на удалённый корень - null', () => {
    expect(prepareForPaste(makeDoc(), createLink('gone'))).toBeNull()
  })

  it('работает с замороженным входом (не мутирует)', () => {
    const doc = makeDoc()
    const a = doc.roots[0]?.node
    if (a === undefined) throw new Error('нет корня A')
    expect(() => prepareForPaste(doc, a)).not.toThrow()
  })
})
