/** Тесты node-style: только отличия от CSS по умолчанию, порядок свойств, учёт родителя для self, инлайн-строка. */
import { describe, expect, it } from 'vitest'
import type { BlockNode, ContainerKind, LayoutNode, SelfProps } from '@shared'
import { createBlock } from '@/scripts/pages/canvas/factories'
import { styleEntries, toInlineStyle, toStyleObject } from '@/scripts/pages/canvas/node-style'

/** Блок нужного вида с подмешанными полями контейнера и self. */
function make(kind: ContainerKind, container: object = {}, extra: Partial<BlockNode> = {}): BlockNode {
  const node = createBlock(kind, 'x')
  return { ...node, ...extra, container: { ...node.container, ...container } }
}

/** Стили узла как объект: удобно сравнивать. */
function styles(node: LayoutNode, parent: ContainerKind | null = null): Record<string, string> {
  return toStyleObject(styleEntries(node, parent))
}

describe('flex', () => {
  it('значения по умолчанию дают только display', () => {
    expect(styles(make('flex'))).toEqual({ display: 'flex' })
  })

  it('выводит только отличия от CSS по умолчанию', () => {
    const node = make('flex', { direction: 'column', wrap: true, justify: 'center', align: 'flex-end', gap: 16 })
    expect(styles(node)).toEqual({
      display: 'flex',
      'flex-direction': 'column',
      'flex-wrap': 'wrap',
      'justify-content': 'center',
      'align-items': 'flex-end',
      gap: '16px',
    })
  })

  it('gap 0 выводится как 0px', () => {
    expect(styles(make('flex', { gap: 0 }))).toEqual({ display: 'flex', gap: '0px' })
  })
})

describe('grid', () => {
  it('по умолчанию: display и колонки, rows auto не выводится', () => {
    expect(styles(make('grid'))).toEqual({ display: 'grid', 'grid-template-columns': 'repeat(2, 1fr)' })
  })

  it('пустые строки шаблонов не выводятся, пробелы обрезаются', () => {
    expect(styles(make('grid', { columns: '   ', rows: '' }))).toEqual({ display: 'grid' })
    expect(styles(make('grid', { columns: ' 1fr 2fr ', rows: ' 40px ' }))).toEqual({
      display: 'grid',
      'grid-template-columns': '1fr 2fr',
      'grid-template-rows': '40px',
    })
  })

  it('rows, равное auto после trim, не выводится', () => {
    expect(styles(make('grid', { columns: '', rows: ' auto ' }))).toEqual({ display: 'grid' })
  })

  it('justify-items и align-items выводятся, если не stretch', () => {
    const node = make('grid', { columns: '', justifyItems: 'center', alignItems: 'end' })
    expect(styles(node)).toEqual({ display: 'grid', 'justify-items': 'center', 'align-items': 'end' })
  })

  it('равные зазоры сливаются в gap, включая 0', () => {
    expect(styles(make('grid', { columns: '', columnGap: 8, rowGap: 8 })).gap).toBe('8px')
    expect(styles(make('grid', { columns: '', columnGap: 0, rowGap: 0 })).gap).toBe('0px')
  })

  it('разные зазоры выводятся по отдельности', () => {
    expect(styles(make('grid', { columns: '', columnGap: 8, rowGap: 16 }))).toEqual({
      display: 'grid',
      'column-gap': '8px',
      'row-gap': '16px',
    })
  })

  it('null-зазор не выводится', () => {
    expect(styles(make('grid', { columns: '', columnGap: 8, rowGap: null }))).toEqual({
      display: 'grid',
      'column-gap': '8px',
    })
    expect(styles(make('grid', { columns: '', columnGap: null, rowGap: 4 }))).toEqual({
      display: 'grid',
      'row-gap': '4px',
    })
  })
})

describe('self', () => {
  const full: SelfProps = {
    flex: ' 1 1 0 ',
    width: ' 200px ',
    height: ' 50% ',
    minHeight: ' 10px ',
    colSpan: 2,
    rowSpan: 3,
  }

  it('flex-родитель: flex, width, height, min-height; span игнорируются', () => {
    expect(styles(make('flex', {}, { self: full }), 'flex')).toEqual({
      display: 'flex',
      flex: '1 1 0',
      width: '200px',
      height: '50%',
      'min-height': '10px',
    })
  })

  it('grid-родитель: span, height, min-height; flex и width игнорируются', () => {
    expect(styles(make('flex', {}, { self: full }), 'grid')).toEqual({
      display: 'flex',
      'grid-column': 'span 2',
      'grid-row': 'span 3',
      height: '50%',
      'min-height': '10px',
    })
  })

  it('flex по умолчанию 0 1 auto не выводится (и с лишними пробелами), другое значение выводится', () => {
    expect(styles(make('flex', {}, { self: { flex: '0 1 auto' } }), 'flex')).toEqual({ display: 'flex' })
    expect(styles(make('flex', {}, { self: { flex: ' 0  1 auto ' } }), 'flex')).toEqual({ display: 'flex' })
    expect(styles(make('flex', {}, { self: { flex: '0 0 auto' } }), 'flex')).toEqual({
      display: 'flex',
      flex: '0 0 auto',
    })
  })

  it('span 1 не выводится', () => {
    expect(styles(make('flex', {}, { self: { colSpan: 1, rowSpan: 1 } }), 'grid')).toEqual({ display: 'flex' })
  })

  it('у корня self не выводится вообще', () => {
    expect(styles(make('flex', {}, { self: full }), null)).toEqual({ display: 'flex' })
  })

  it('пустые и пробельные строки не выводятся', () => {
    const node = make('flex', {}, { self: { flex: '', width: '  ', height: '', minHeight: ' ' } })
    expect(styles(node, 'flex')).toEqual({ display: 'flex' })
  })
})

describe('не стили', () => {
  it('repeat, label, description и tag игнорируются', () => {
    const node = make('flex', {}, { repeat: 5, label: 'L', description: 'D', tag: 'header' })
    expect(styles(node)).toEqual({ display: 'flex' })
  })

  it('внутреннего отступа нет: в редакторе он задаётся классом, в экспорт не идёт', () => {
    expect(styles(make('flex')).padding).toBeUndefined()
    expect(styles(make('grid'), 'flex').padding).toBeUndefined()
  })
})

describe('порядок и сериализация', () => {
  const node = make(
    'flex',
    { direction: 'column', wrap: true, justify: 'center', align: 'center', gap: 4 },
    { self: { flex: '1', width: '2px', height: '3px', minHeight: '4px' } },
  )

  it('порядок: display, direction, wrap, justify, align, gap, self', () => {
    expect(styleEntries(node, 'flex').map(([property]) => property)).toEqual([
      'display',
      'flex-direction',
      'flex-wrap',
      'justify-content',
      'align-items',
      'gap',
      'flex',
      'width',
      'height',
      'min-height',
    ])
  })

  it('порядок grid: display, шаблоны, выравнивание, gap', () => {
    const grid = make('grid', {
      columns: '1fr',
      rows: '2fr',
      justifyItems: 'center',
      alignItems: 'center',
      columnGap: 1,
      rowGap: 2,
    })
    expect(styleEntries(grid, null).map(([property]) => property)).toEqual([
      'display',
      'grid-template-columns',
      'grid-template-rows',
      'justify-items',
      'align-items',
      'column-gap',
      'row-gap',
    ])
  })

  it('toInlineStyle: разделитель «; », без завершающей точки с запятой', () => {
    expect(toInlineStyle(styleEntries(make('flex', { gap: 16 }), null))).toBe('display:flex; gap:16px')
  })

  it('toInlineStyle пустого списка — пустая строка', () => {
    expect(toInlineStyle([])).toBe('')
  })
})
