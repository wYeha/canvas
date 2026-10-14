/** Тесты охвата экспорта: порядок корней, один/несколько/ни одного, пустой документ, инъекция в имени документа, снапшот демо. */
import { describe, expect, it } from 'vitest'
import { createDemoDocument } from '@/scripts/pages/canvas/demo-document'
import { exportRootHtml } from '@/scripts/pages/canvas/export/export-html'
import { exportRootsHtml, exportScopeHtml, planRoots } from '@/scripts/pages/canvas/export/export-scope'
import { block, docOf, root } from './export-fixture'

/** Документ из трёх простых корней A, B, C. */
function threeRoots() {
  const a = root(block('flex', 'A'), 400, null, false)
  const b = root(block('flex', 'B'), 500, 300, false)
  const c = root(block('flex', 'C'), 600, null, true)
  return { doc: docOf(a, b, c), a, b, c }
}

describe('planRoots', () => {
  it('порядок по doc.roots, а не по rootIds; чужие id игнорируются', () => {
    const { doc, a, c } = threeRoots()
    const plans = planRoots(doc, [c.node.id, 'нет-такого', a.node.id])
    expect(plans.map((p) => p.entry.node.label)).toEqual(['A', 'C'])
    expect(plans.map((p) => p.role)).toEqual(['standalone', 'standalone'])
  })

  it('all возвращает все корни', () => {
    expect(planRoots(threeRoots().doc, 'all')).toHaveLength(3)
  })
})

describe('exportScopeHtml', () => {
  it('один отмеченный корень = exportRootHtml без шапки и нумерации', () => {
    const { doc, b } = threeRoots()
    const text = exportScopeHtml(doc, { kind: 'roots', rootIds: [b.node.id] }, {})
    expect(text).toBe(exportRootHtml(doc, b))
    expect(text).not.toContain(' из ')
  })

  it('пустой список и пустой документ дают пустую строку', () => {
    expect(exportScopeHtml(threeRoots().doc, { kind: 'roots', rootIds: [] }, {})).toBe('')
    expect(exportScopeHtml(docOf(), { kind: 'all' }, {})).toBe('')
    expect(exportRootsHtml(docOf(), [])).toBe('')
  })

  it('несколько корней: шапка, нумерация, пустая строка между, один перевод строки в конце', () => {
    const text = exportScopeHtml(threeRoots().doc, { kind: 'all' }, {})
    expect(text.startsWith('<!-- Документ «Тест»: корневых блоков 3 -->\n\n<!-- 1 из 3. Корневой блок «A», ')).toBe(
      true,
    )
    expect(text).toContain('\n\n<!-- 2 из 3. Корневой блок «B», ширина превью 500px, высота превью 300px -->\n')
    expect(text).toContain('\n\n<!-- 3 из 3. Корневой блок «C», max-width 600px по центру -->\n')
    expect(text.endsWith('>\n')).toBe(true)
    expect(text.endsWith('\n\n')).toBe(false)
  })

  it('selected делегирует экспорту выделенного узла', () => {
    const { doc, a } = threeRoots()
    expect(exportScopeHtml(doc, { kind: 'selected', nodeId: a.node.id }, {})).toBe(exportRootHtml(doc, a))
    expect(exportScopeHtml(doc, { kind: 'selected', nodeId: 'нет' }, {})).toBe('')
  })

  it('имя документа с --> не закрывает комментарий шапки', () => {
    const { doc } = threeRoots()
    const text = exportScopeHtml({ ...doc, name: 'x --><script>alert(1)</script><!--' }, { kind: 'all' }, {})
    const header = text.split('\n')[0] ?? ''
    expect(header.indexOf('-->')).toBe(header.length - 3)
    expect(header).not.toContain('<script>')
  })

  it('демо: все корни (снапшот)', () => {
    expect(exportScopeHtml(createDemoDocument(), { kind: 'all' }, {})).toMatchSnapshot()
  })
})
