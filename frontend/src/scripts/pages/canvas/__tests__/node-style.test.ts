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
    const node = make('flex', { direction: 'column', wrap: true, justify: 'center', align: 'flex-end' })
    expect(styles(node)).toEqual({
      display: 'flex',
      'flex-direction': 'column',
      'flex-wrap': 'wrap',
      'justify-content': 'center',
      'align-items': 'flex-end',
    })
  })

  it('gap не выводится никогда: он только редакторский', () => {
    expect(styleEntries(make('flex'), null).map(([property]) => property)).not.toContain('gap')
    expect(styleEntries(make('grid'), null).map(([property]) => property)).not.toContain('gap')
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

  it('flex 0 1 AUTO (регистр) не выводится', () => {
    expect(styles(make('flex', {}, { self: { flex: '0 1 AUTO' } }), 'flex')).toEqual({ display: 'flex' })
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
    { direction: 'column', wrap: true, justify: 'center', align: 'center' },
    { self: { flex: '1', width: '2px', height: '3px', minHeight: '4px' } },
  )

  it('порядок: display, direction, wrap, justify, align, self', () => {
    expect(styleEntries(node, 'flex').map(([property]) => property)).toEqual([
      'display',
      'flex-direction',
      'flex-wrap',
      'justify-content',
      'align-items',
      'flex',
      'width',
      'height',
      'min-height',
    ])
  })

  it('порядок grid: display, шаблоны, выравнивание', () => {
    const grid = make('grid', {
      columns: '1fr',
      rows: '2fr',
      justifyItems: 'center',
      alignItems: 'center',
    })
    expect(styleEntries(grid, null).map(([property]) => property)).toEqual([
      'display',
      'grid-template-columns',
      'grid-template-rows',
      'justify-items',
      'align-items',
    ])
  })

  it('toInlineStyle: разделитель «; », без завершающей точки с запятой', () => {
    expect(toInlineStyle(styleEntries(make('flex', { direction: 'column' }), null))).toBe(
      'display:flex; flex-direction:column',
    )
  })

  it('toInlineStyle пустого списка — пустая строка', () => {
    expect(toInlineStyle([])).toBe('')
  })
})
