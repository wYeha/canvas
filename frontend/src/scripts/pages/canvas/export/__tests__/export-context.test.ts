/** Тесты контекста вложенного блока и экспорта выделенного узла: flex/grid-родитель, замеры, повтор, инъекции. */
import { describe, expect, it } from 'vitest'
import type { BlockNode, FlexContainer, GridContainer, LayoutDocument, LayoutNode, NodeId, SelfProps } from '@shared'
import { createFlexContainer, createGridContainer } from '@/scripts/pages/canvas/factories'
import { createDemoDocument } from '@/scripts/pages/canvas/demo-document'
import { contextLines } from '@/scripts/pages/canvas/export/export-context'
import { exportRootHtml } from '@/scripts/pages/canvas/export/export-html'
import { exportSelectedHtml } from '@/scripts/pages/canvas/export/export-selected'
import { block, docOf, root, smallTree } from './export-fixture'

/** Первый узел с подписью `label` в документе (обход в глубину). */
function findByLabel(doc: LayoutDocument, label: string): LayoutNode {
  const stack: LayoutNode[] = doc.roots.map((entry) => entry.node)
  for (let node = stack.shift(); node; node = stack.shift()) {
    if (node.label === label) return node
    stack.unshift(...node.children)
  }
  throw new Error(`нет узла «${label}»`)
}

/** Id узла по подписи. */
function idOf(doc: LayoutDocument, label: string): NodeId {
  return findByLabel(doc, label).id
}

/** Текст комментария-контекста одной строкой на строку. */
function context(doc: LayoutDocument, label: string, widths?: Record<string, number>): string {
  const measuredWidths = widths
    ? new Map(Object.entries(widths).map(([name, width]) => [idOf(doc, name), width]))
    : undefined
  return contextLines(doc, idOf(doc, label), { measuredWidths }).join('\n')
}

/** Flex-родитель «P» с изменёнными полями контейнера. */
function flexParent(extra: Partial<FlexContainer>): Partial<BlockNode> {
  return { container: { ...createFlexContainer(), ...extra } }
}

/** Grid-родитель «P» с изменёнными полями контейнера. */
function gridParent(extra: Partial<GridContainer>): Partial<BlockNode> {
  return { container: { ...createGridContainer(), ...extra } }
}

/** Строка «Родитель» или «Место» (без отступа) для единственного ребёнка с `self` в родителе «P». */
function lineOf(parentExtra: Partial<BlockNode>, self: SelfProps, line: 'parent' | 'place'): string {
  const leaf = block('flex', 'leaf', { self })
  const parent = block(parentExtra.container?.kind ?? 'flex', 'P', parentExtra, [leaf])
  const doc = docOf(root(block('flex', 'R', {}, [parent]), 800, null, false))
  return (contextLines(doc, leaf.id, {})[line === 'parent' ? 2 : 3] ?? '').trim()
}

describe('contextLines', () => {
  const catalog = docOf(root(smallTree(), 1280, 900, false))

  it('ребёнок flex column: главная ось — высота, ширина растягивается; без замера', () => {
    expect(context(catalog, 'cards')).toMatchInlineSnapshot(`
      "<!-- Фрагмент корневого блока «Каталог» (ширина превью 1280px, высота превью 900px)
        Путь: Каталог › cards
        Родитель «Каталог» (main): flex column
        Место: 1-й ребёнок из 2; ширина — растягивается на всю ширину родителя; высота — flex:1
      -->"
    `)
  })

  it('вложенный во flex с замером узла и родителя', () => {
    expect(context(catalog, 'cards', { cards: 1240, Каталог: 1280 })).toMatchInlineSnapshot(`
      "<!-- Фрагмент корневого блока «Каталог» (ширина превью 1280px, высота превью 900px)
        Путь: Каталог › cards
        Родитель «Каталог» (main): flex column
        Место: 1-й ребёнок из 2; ширина — растягивается на всю ширину родителя (~1240px, ~100% ширины родителя); высота — flex:1
      -->"
    `)
  })

  it('замер только узла: без доли родителя', () => {
    expect(context(catalog, 'footer', { footer: 1216 })).toContain(
      'ширина — растягивается на всю ширину родителя (~1216px); высота — height:80px\n',
    )
  })

  it('ребёнок flex row: главная ось — ширина, поперечная — по align-items', () => {
    const leaf = block('flex', 'logo', { self: { width: '120px', minHeight: '40px' } })
    const row = block('flex', 'row', {}, [leaf])
    const stretchDoc = docOf(root(block('flex', 'R', {}, [row]), 800, null, false))
    expect(context(stretchDoc, 'logo')).toContain(
      'ширина — width:120px; высота — растягивается на всю высоту родителя, min-height:40px\n',
    )
    const centered = block('flex', 'row', { container: { ...createFlexContainer(), align: 'center' } }, [leaf])
    const centeredDoc = docOf(root(block('flex', 'R', {}, [centered]), 800, null, false))
    expect(context(centeredDoc, 'logo')).toContain('ширина — width:120px; высота — по содержимому, min-height:40px\n')
  })

  it('ребёнок flex column с align-items center: ширина по содержимому, высота — flex', () => {
    const leaf = block('flex', 'item', { self: { flex: '1' } })
    const container = { ...createFlexContainer(), direction: 'column' as const, align: 'center' as const }
    const doc = docOf(root(block('flex', 'R', {}, [block('flex', 'col', { container }, [leaf])]), 800, null, false))
    expect(context(doc, 'item')).toContain('ширина — по содержимому; высота — flex:1\n')
  })

  it('grid: rowSpan', () => {
    expect(context(catalog, 'gallery')).toContain('ширина — занимает 1 колонку; высота — занимает 2 строки (span 2)\n')
  })

  it('flex row-reverse / column-reverse: оси как у row / column', () => {
    const self = { flex: '1' }
    expect(lineOf(flexParent({ direction: 'row-reverse' }), self, 'place')).toBe(
      'Место: 1-й ребёнок из 1; ширина — flex:1; высота — растягивается на всю высоту родителя',
    )
    expect(lineOf(flexParent({ direction: 'column-reverse' }), self, 'place')).toBe(
      'Место: 1-й ребёнок из 1; ширина — растягивается на всю ширину родителя; высота — flex:1',
    )
  })

  it('flex row + wrap: поперечная ось растягивается на свою строку', () => {
    expect(lineOf(flexParent({ wrap: true }), { width: '200px' }, 'place')).toBe(
      'Место: 1-й ребёнок из 1; ширина — width:200px; высота — растягивается на высоту своей строки',
    )
    expect(lineOf(flexParent({ wrap: true }), {}, 'parent')).toBe('Родитель «P» (div): flex row, wrap')
  })

  it('grid: justify-items / align-items не stretch — по содержимому в пределах ячейки', () => {
    const parent = gridParent({ justifyItems: 'center', alignItems: 'start' })
    expect(lineOf(parent, {}, 'parent')).toBe(
      'Родитель «P» (div): grid, колонки «repeat(2, 1fr)» (2 колонки), justify-items center, align-items start',
    )
    expect(lineOf(parent, {}, 'place')).toBe(
      'Место: 1-й ребёнок из 1; ширина — по содержимому в пределах 1 колонки; высота — по содержимому',
    )
    expect(lineOf(parent, { colSpan: 2, rowSpan: 3 }, 'place')).toBe(
      'Место: 1-й ребёнок из 1; ширина — по содержимому в пределах 2 колонок (span 2); ' +
        'высота — по содержимому в пределах 3 строк (span 3)',
    )
  })

  it('grid: заданные rows — высота строки сетки; height и min-height ребёнка', () => {
    const parent = gridParent({ rows: '100px 1fr' })
    expect(lineOf(parent, {}, 'place')).toContain('высота — высота строки сетки')
    expect(lineOf(gridParent({}), { height: '120px', minHeight: '80px', rowSpan: 2 }, 'place')).toContain(
      'высота — занимает 2 строки (span 2), height:120px, min-height:80px',
    )
    expect(lineOf(gridParent({}), { minHeight: '80px' }, 'place')).toContain(
      'высота — по содержимому строки, min-height:80px',
    )
  })

  it('grid: зазоров нет (gap только в редакторе), auto-fill и именованные линии', () => {
    expect(lineOf(gridParent({}), {}, 'parent')).toBe('Родитель «P» (div): grid, колонки «repeat(2, 1fr)» (2 колонки)')
    expect(lineOf(gridParent({ columns: 'repeat(auto-fill, minmax(200px, 1fr))' }), {}, 'parent')).toBe(
      'Родитель «P» (div): grid, колонки «repeat(auto-fill, minmax(200px, 1fr))»',
    )
    expect(lineOf(gridParent({ columns: '[full-start] 1fr [main] 2fr [full-end]' }), {}, 'parent')).toBe(
      'Родитель «P» (div): grid, колонки «[full-start] 1fr [main] 2fr [full-end]» (2 колонки)',
    )
  })

  it('небезопасные rows и self в обход zod: строки не указаны, свойство пропущено', () => {
    const parent = gridParent({ rows: '1fr;}</style>' })
    expect(lineOf(parent, {}, 'parent')).toBe(
      'Родитель «P» (div): grid, колонки «repeat(2, 1fr)» (2 колонки), строки не указаны',
    )
    expect(lineOf(flexParent({}), { width: 'x" onclick="1', height: '1px;}' }, 'place')).toBe(
      'Место: 1-й ребёнок из 1; ширина — по содержимому; высота — растягивается на всю высоту родителя',
    )
  })

  it('замер: доля от ширины родителя без редакторского отступа, нечисловые замеры игнорируются', () => {
    const leaf = block('flex', 'leaf', {})
    const parent = block('flex', 'P', {}, [leaf])
    const doc = docOf(root(block('flex', 'R', {}, [parent]), 800, null, false))
    /** Строка «Место» при заданных замерах. */
    const at = (widths: Map<NodeId, number>): string => contextLines(doc, leaf.id, { measuredWidths: widths })[3] ?? ''
    expect(
      at(
        new Map([
          [leaf.id, 50],
          [parent.id, 140],
        ]),
      ),
    ).toContain('(~50px, ~50% ширины родителя)')
    expect(
      at(
        new Map([
          [leaf.id, 50],
          [parent.id, 40],
        ]),
      ),
    ).toContain('(~50px);')
    expect(
      at(
        new Map([
          [leaf.id, 50],
          [parent.id, Number.NaN],
        ]),
      ),
    ).toContain('(~50px);')
    expect(
      at(
        new Map([
          [leaf.id, Number.POSITIVE_INFINITY],
          [parent.id, 150],
        ]),
      ),
    ).toContain('ширина — по содержимому;')
  })

  it('в grid со span и лист с repeat', () => {
    expect(context(catalog, 'promo')).toMatchInlineSnapshot(`
      "<!-- Фрагмент корневого блока «Каталог» (ширина превью 1280px, высота превью 900px)
        Путь: Каталог › cards › promo
        Родитель «cards» (div): grid, колонки «repeat(3, 1fr)» (3 колонки)
        Место: 3-й ребёнок из 4; ширина — занимает 2 колонки (span 2); высота — по содержимому строки
      -->"
    `)
    expect(context(catalog, 'card')).toMatchInlineSnapshot(`
      "<!-- Фрагмент корневого блока «Каталог» (ширина превью 1280px, высота превью 900px)
        Путь: Каталог › cards › card
        Родитель «cards» (div): grid, колонки «repeat(3, 1fr)» (3 колонки)
        Место: 1-й ребёнок из 4; ширина — занимает 1 колонку; высота — по содержимому строки; повторяется ×3
      -->"
    `)
  })

  it('корень и отсутствующий узел: контекста нет', () => {
    expect(contextLines(catalog, idOf(catalog, 'Каталог'), {})).toEqual([])
    expect(contextLines(catalog, 'missing', {})).toEqual([])
  })

  it('инъекции в подписях пути и в columns родителя экранируются', () => {
    const leaf = block('flex', 'x--><script>', {})
    const parent: BlockNode = block(
      'grid',
      '<!--evil-->',
      { container: { ...createGridContainer(), columns: '1fr --> <b>', rows: 'a\nb' } },
      [leaf],
    )
    const doc = docOf(root(block('flex', 'R-->', {}, [parent]), 800, null, true))
    const text = contextLines(doc, leaf.id, {}).join('\n')
    expect(text).toMatchInlineSnapshot(`
      "<!-- Фрагмент корневого блока «R- ->» (max-width 800px по центру)
        Путь: R- -> › &lt;!- -evil- -> › x- ->&lt;script>
        Родитель «&lt;!- -evil- ->» (div): grid, колонки не указаны, строки «a b»
        Место: 1-й ребёнок из 1; ширина — занимает 1 колонку; высота — высота строки сетки
      -->"
    `)
    expect(text).toContain('колонки не указаны')
    expect(text.slice(4, -3)).not.toMatch(/--|</)
  })
})

describe('exportSelectedHtml', () => {
  it('корень — как exportRootHtml', () => {
    const doc = createDemoDocument()
    const [entry] = doc.roots
    if (!entry) throw new Error('нет корня')
    expect(exportSelectedHtml(doc, entry.node.id, {})).toBe(exportRootHtml(doc, entry))
  })

  it('отсутствующий узел → пустая строка', () => {
    expect(exportSelectedHtml(createDemoDocument(), 'missing', {})).toBe('')
  })

  it('демо: «charts» с замером', () => {
    const doc = createDemoDocument()
    const widths = new Map([
      [idOf(doc, 'charts'), 1136],
      [idOf(doc, 'main'), 1176],
    ])
    expect(exportSelectedHtml(doc, idOf(doc, 'charts'), { measuredWidths: widths })).toMatchSnapshot()
  })

  it('демо: «kpi-row» без замера', () => {
    const doc = createDemoDocument()
    expect(exportSelectedHtml(doc, idOf(doc, 'kpi-row'), {})).toMatchSnapshot()
  })
})
