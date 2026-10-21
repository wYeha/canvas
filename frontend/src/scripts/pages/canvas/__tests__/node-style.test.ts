/** Тесты node-style: только отличия от CSS по умолчанию, порядок свойств, учёт родителя для self, инлайн-строка. */
import { describe, expect, it } from 'vitest'
import type { BlockNode, ContainerKind, LayoutNode, SelfProps } from '@shared'
import { createBlock } from '@/scripts/pages/canvas/factories'
import { styleEntries, toInlineStyle, toStyleObject } from '@/scripts/pages/canvas/node-style'

/** Блок нужного вида с подмешанными полями контейнера и self. */
function make(kind: ContainerKind, container: object = {}, extra: Partial<BlockNode> = {}): BlockNode {
  const node = createBlock(kind, 'x')
  // Без зазора по умолчанию (у нового блока M): тесты проверяют остальные свойства; gap — отдельно
  const base: Record<string, unknown> = { ...node.container }
  Reflect.deleteProperty(base, 'gap')
  return { ...node, ...extra, container: { ...base, ...container } as BlockNode['container'] }
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

  it('без токена gap не выводится (редакторский минимум — только классом)', () => {
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

  it('grid-родитель: span, фиксированные width и height, min-height; flex игнорируется', () => {
    expect(styles(make('flex', {}, { self: full }), 'grid')).toEqual({
      display: 'flex',
      'grid-column': 'span 2',
      'grid-row': 'span 3',
      width: '200px',
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

describe('режимы размера (этап 14)', () => {
  /** Стили ребёнка с `self` во flex-родителе с направлением `direction`. */
  function child(self: SelfProps, direction: 'row' | 'column' | 'row-reverse' = 'row') {
    return toStyleObject(styleEntries(make('flex', {}, { self }), 'flex', direction))
  }

  it('заполнить по главной оси: flex 1 (базис 0%, не 0 — иначе схлопывается в колонке без высоты) и минимум 0', () => {
    expect(child({ widthMode: 'fill' })).toEqual({ display: 'flex', flex: '1', 'min-width': '0' })
    expect(child({ heightMode: 'fill' }, 'column')).toEqual({ display: 'flex', flex: '1', 'min-height': '0' })
    expect(child({ widthMode: 'fill' }, 'row-reverse')).toEqual({ display: 'flex', flex: '1', 'min-width': '0' })
  })

  it('заполнить по поперечной оси: align-self stretch', () => {
    expect(child({ widthMode: 'fill' }, 'column')).toEqual({ display: 'flex', 'align-self': 'stretch' })
  })

  it('фиксированный по главной оси: flex none и число; без числа — только flex none', () => {
    expect(child({ widthMode: 'fixed', width: '360px' })).toEqual({ display: 'flex', flex: 'none', width: '360px' })
    expect(child({ widthMode: 'fixed' })).toEqual({ display: 'flex', flex: 'none' })
    expect(child({ heightMode: 'fixed', height: '48px' })).toEqual({ display: 'flex', height: '48px' })
  })

  it('свободный flex важнее режима, явный минимум важнее автоматического 0', () => {
    expect(child({ widthMode: 'fill', flex: '2 1 0' })).toEqual({ display: 'flex', flex: '2 1 0' })
    expect(child({ widthMode: 'fill', minWidth: '120px' })).toEqual({
      display: 'flex',
      flex: '1',
      'min-width': '120px',
    })
  })

  it('min-width и max-width', () => {
    expect(child({ minWidth: '0', maxWidth: '640px' })).toEqual({
      display: 'flex',
      'min-width': '0',
      'max-width': '640px',
    })
  })

  it('grid-родитель: заполнить — растяжение в ячейке', () => {
    expect(styles(make('flex', {}, { self: { widthMode: 'fill', heightMode: 'fill' } }), 'grid')).toEqual({
      display: 'flex',
      'justify-self': 'stretch',
      'align-self': 'stretch',
    })
  })

  it('gap токеном — через переменную', () => {
    const pair = { children: [createBlock('flex', 'a'), createBlock('flex', 'b')] }
    expect(styles(make('grid', { gap: 'l' }, pair))).toEqual({
      display: 'grid',
      'grid-template-columns': 'repeat(2, 1fr)',
      gap: 'var(--gap-l)',
    })
    // У листа и единственного ребёнка зазор ничего не делает и не выводится
    expect(styles(make('grid', { gap: 'l' }, { children: [createBlock('flex', 'a')] }))).not.toHaveProperty('gap')
  })

  it('единственный ребёнок с повтором ×N — это N соседей, зазор нужен', () => {
    const repeated = { children: [{ ...createBlock('flex', 'a'), repeat: 4 }] }
    expect(styles(make('flex', { gap: 'm' }, repeated))).toHaveProperty('gap', 'var(--gap-m)')
  })
})
