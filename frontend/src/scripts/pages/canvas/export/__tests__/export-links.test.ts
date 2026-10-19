/**
 * Тесты экспорта со связями: источник на месте плашки со свойствами места и комментарием `компонент «…»`,
 * цепочки подстановок, подключённые корни в экспорте всех не повторяются, защита от цикла.
 */
import { describe, expect, it } from 'vitest'
import type { BlockNode, LayoutDocument } from '@shared'
import { createLinkBlock } from '@/scripts/pages/canvas/factories'
import { exportRootHtml } from '@/scripts/pages/canvas/export/export-html'
import { exportScopeHtml, planRoots } from '@/scripts/pages/canvas/export/export-scope'
import { block, docOf, root } from './export-fixture'

/** Связь на корень `sourceId` со свойствами места. */
function link(sourceId: string, extra: Partial<BlockNode> = {}): BlockNode {
  return { ...createLinkBlock(sourceId), ...extra }
}

/** Документ: страница со связью ×3 на карточку и обычным блоком; карточка — корень с описанием и детьми. */
function catalog(): LayoutDocument {
  const card = block('flex', 'Карточка', { id: 'card', description: 'Карточка товара' }, [
    block('flex', 'фото'),
    block('flex', 'цена', { tag: 'section' }),
  ])
  const page = block('grid', 'Каталог', { id: 'page' }, [
    link('card', { self: { colSpan: 2 }, repeat: 3 }),
    block('flex', 'footer'),
  ])
  return docOf(root(page, 1440, null, false), root(card, 320, null, false))
}

describe('экспорт связей', () => {
  it('на месте связи — источник со свойствами места и комментарием компонента', () => {
    const doc = catalog()
    const [page] = doc.roots
    if (!page) throw new Error('нет корня')
    const html = exportRootHtml(doc, page)
    expect(html).toContain('<!-- компонент «Карточка» ×3 — Карточка товара -->')
    expect(html).toContain('grid-column:span 2')
    expect(html).toContain('<!-- цена -->')
    // Ширина превью источника в место не переносится
    expect(html).not.toContain('320px')
    expect(html).toMatchSnapshot()
  })

  it('экспорт всех: подключённый корень отдельно не выводится', () => {
    const doc = catalog()
    expect(planRoots(doc, 'all').map((plan) => plan.entry.node.id)).toEqual(['page'])
    expect(planRoots(doc, ['page', 'card'])).toHaveLength(2)
    const html = exportScopeHtml(doc, { kind: 'all' }, {})
    expect(html).not.toContain('Корневой блок «Карточка»')
    expect(html).toContain('компонент «Карточка»')
  })

  it('цепочка: источник со связью внутри подставляется целиком', () => {
    const c = block('flex', 'C', { id: 'C' }, [block('flex', 'лист C')])
    const b = block('flex', 'B', { id: 'B' }, [link('C')])
    const a = block('flex', 'A', { id: 'A' }, [link('B')])
    const doc = docOf(root(a, 800, null, false), root(b, 400, null, false), root(c, 200, null, false))
    const html = exportScopeHtml(doc, { kind: 'all' }, {})
    expect(html).toContain('компонент «B»')
    expect(html).toContain('компонент «C»')
    expect(html).toContain('лист C')
    expect(planRoots(doc, 'all')).toHaveLength(1)
  })

  it('выделенная связь экспортируется подставленным источником', () => {
    const doc = catalog()
    const linkId = doc.roots[0]?.node.children[0]?.id ?? ''
    expect(exportScopeHtml(doc, { kind: 'selected', nodeId: linkId }, {})).toContain('компонент «Карточка» ×3')
  })

  it('связь на себя (непроверенный документ) не зацикливается: выводится пустым блоком', () => {
    const self = block('flex', 'S', { id: 'S' }, [link('S')])
    const doc = docOf(root(self, 400, null, false))
    const [entry] = doc.roots
    if (!entry) throw new Error('нет корня')
    expect(exportRootHtml(doc, entry)).not.toContain('компонент')
  })
})
