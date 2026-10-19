/** Тесты шаблонов-заготовок: структура, подписи, повторы, ширины корня, новые id и проходимость parseDocument. */
import { describe, expect, it } from 'vitest'
import { parseDocument, type BlockNode, type LayoutDocument } from '@shared'
import { BLOCK_TEMPLATES, findBlockTemplate } from '@/scripts/pages/canvas/block-templates'
import { createDocument } from '@/scripts/pages/canvas/factories'

/** Возвращает шаблон по id или падает. */
function build(id: string): BlockNode {
  const template = findBlockTemplate(id)
  if (template === undefined) throw new Error(id)
  return template.build()
}

/** Все блоки поддерева, включая корень. */
function flatten(node: BlockNode): BlockNode[] {
  return [node, ...node.children.flatMap((child) => flatten(child))]
}

/** Документ с одним корнем-шаблоном. */
function docWith(id: string): LayoutDocument {
  const template = findBlockTemplate(id)
  if (template === undefined) throw new Error(id)
  const canvas = { x: 0, y: 0, width: template.rootWidth, height: null, exportMaxWidth: false }
  return { ...createDocument(), roots: [{ canvas, node: template.build() }] }
}

describe('block-templates', () => {
  it('четыре шаблона в нужном порядке', () => {
    expect(BLOCK_TEMPLATES.map((t) => t.label)).toEqual([
      'Ряд KPI',
      'Сетка графиков 2×2',
      'Фильтры + таблица',
      'Сайдбар + контент',
    ])
  })

  it('ширины корня: 960, 960, 960, 1440', () => {
    expect(BLOCK_TEMPLATES.map((t) => t.rootWidth)).toEqual([960, 960, 960, 1440])
  })

  it('у всех блоков self.flex = «0 1 auto» (кроме KPI с flex 1)', () => {
    for (const template of BLOCK_TEMPLATES) {
      for (const node of flatten(template.build())) {
        expect(node.self.flex).toBe(node.label === 'KPI' ? '1' : '0 1 auto')
      }
    }
  })

  it('ряд KPI: flex row, gap 16, KPI ×4', () => {
    const root = build('kpi-row')
    expect(root.container).toMatchObject({ kind: 'flex', direction: 'row', gap: 16 })
    expect(root.children).toHaveLength(1)
    expect(root.children[0]).toMatchObject({ label: 'KPI', repeat: 4 })
  })

  it('сетка графиков: grid 1fr 1fr, gap 16, график ×4 высотой 200px', () => {
    const root = build('chart-grid')
    expect(root.container).toMatchObject({ kind: 'grid', columns: '1fr 1fr', columnGap: 16, rowGap: 16 })
    expect(root.children[0]).toMatchObject({ label: 'График', repeat: 4, self: { height: '200px' } })
  })

  it('фильтры + таблица: колонка, фильтры ×4 в ряду, таблица 320px', () => {
    const root = build('filters-table')
    expect(root.container).toMatchObject({ kind: 'flex', direction: 'column', gap: 16 })
    const [filters, table] = root.children as BlockNode[]
    expect(filters?.label).toBe('Фильтры')
    expect(filters?.container).toMatchObject({ direction: 'row', gap: 8 })
    expect(filters?.children[0]).toMatchObject({ label: 'Фильтр', repeat: 4 })
    expect(table).toMatchObject({ label: 'Таблица', self: { height: '320px' } })
  })

  it('сайдбар + контент: grid 250px 1fr, gap 24, меню ×5, контент min-height 400px', () => {
    const root = build('sidebar-content')
    expect(root.container).toMatchObject({ kind: 'grid', columns: '250px 1fr', columnGap: 24, rowGap: 24 })
    const [sidebar, content] = root.children as BlockNode[]
    expect(sidebar?.container).toMatchObject({ direction: 'column', gap: 8 })
    expect(sidebar?.children[0]).toMatchObject({ label: 'Пункт меню', repeat: 5 })
    expect(content).toMatchObject({ label: 'Контент', self: { minHeight: '400px' } })
  })

  it('каждый вызов даёт новые id', () => {
    const first = flatten(build('kpi-row')).map((n) => n.id)
    const second = flatten(build('kpi-row')).map((n) => n.id)
    expect(first.some((id) => second.includes(id))).toBe(false)
  })

  it.each(BLOCK_TEMPLATES.map((t) => t.id))('%s проходит parseDocument', (id) => {
    expect(parseDocument(docWith(id)).ok).toBe(true)
  })
})
