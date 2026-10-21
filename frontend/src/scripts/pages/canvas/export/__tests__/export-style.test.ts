/** Тесты защиты стилей и тегов экспорта: повторная проверка значений и имён свойств, экранирование, свойства корня. */
import { describe, expect, it } from 'vitest'
import type { BlockNode, CanvasPlacement, ContainerKind, LayoutNode } from '@shared'
import { createBlock, createFlexContainer, createGridContainer } from '@/scripts/pages/canvas/factories'
import { styleEntries, type StyleEntry } from '@/scripts/pages/canvas/node-style'
import {
  closeTag,
  exportStyleEntries,
  openTag,
  rootExportEntries,
  safeStyle,
  safeTag,
} from '@/scripts/pages/canvas/export/export-style'

/** Положение корня с нужным флагом `exportMaxWidth`. */
function placement(exportMaxWidth: boolean): CanvasPlacement {
  return { x: 0, y: 0, width: 1440, height: null, exportMaxWidth }
}

/** Блок нужного вида с полями поверх умолчаний фабрики. */
function make(kind: ContainerKind, extra: Partial<BlockNode> = {}, children: LayoutNode[] = []): BlockNode {
  return { ...createBlock(kind, 'x'), ...extra, children }
}

/** Проверяет, что `part` — подпоследовательность `whole` (тот же порядок, возможны пропуски). */
function isSubsequence(part: readonly StyleEntry[], whole: readonly StyleEntry[]): boolean {
  let index = 0
  for (const entry of whole) {
    const next = part[index]
    if (next && next[0] === entry[0] && next[1] === entry[1]) index += 1
  }
  return index === part.length
}

describe('exportStyleEntries', () => {
  it('пустой лист с контейнером по умолчанию: без контейнерной части, self остаётся', () => {
    expect(exportStyleEntries(make('flex'), 'flex')).toEqual([])
    expect(exportStyleEntries(make('grid', { self: { width: '120px' } }), 'flex')).toEqual([
      ['flex', 'none'],
      ['width', '120px'],
    ])
  })

  it('пустые и auto rows у grid по умолчанию считаются умолчанием', () => {
    const container = { ...createGridContainer(), columns: ' repeat(2, 1fr) ', rows: '' }
    expect(exportStyleEntries(make('grid', { container }), null)).toEqual([])
  })

  it.each([
    ['flex: direction', { ...createFlexContainer(), direction: 'column' as const }],
    ['flex: wrap', { ...createFlexContainer(), wrap: true }],
    ['flex: justify', { ...createFlexContainer(), justify: 'center' as const }],
    ['grid: columns', { ...createGridContainer(), columns: '1fr 1fr' }],
    ['grid: rows', { ...createGridContainer(), rows: '100px' }],
    ['grid: align-items', { ...createGridContainer(), alignItems: 'center' as const }],
  ])('лист с изменённым полем (%s) сохраняет контейнерную часть целиком', (_name, container) => {
    const block = make(container.kind, { container })
    expect(exportStyleEntries(block, 'grid')).toEqual(styleEntries(block, 'grid'))
  })

  it('у контейнера с детьми совпадает со styleEntries', () => {
    const block = make('flex', {}, [make('flex')])
    expect(exportStyleEntries(block, null)).toEqual(styleEntries(block, null))
    expect(exportStyleEntries(block, null)).toEqual([['display', 'flex']])
  })

  it('всегда подпоследовательность styleEntries', () => {
    const blocks = [
      make('flex', { self: { flex: '1', height: '40px' } }),
      make('grid', { self: { colSpan: 2, height: '40px' } }),
      make('grid', { container: { ...createGridContainer(), justifyItems: 'center' } }),
    ]
    for (const block of blocks) {
      for (const parentKind of ['flex', 'grid', null] as const) {
        expect(isSubsequence(exportStyleEntries(block, parentKind), styleEntries(block, parentKind))).toBe(true)
      }
    }
  })
})

describe('safeStyle', () => {
  it('безопасные значения проходят в исходном порядке', () => {
    const entries: StyleEntry[] = [
      ['display', 'grid'],
      ['grid-template-columns', 'repeat(2, minmax(0, 1fr))'],
    ]
    expect(safeStyle(entries)).toEqual({
      style: 'display:grid; grid-template-columns:repeat(2, minmax(0, 1fr))',
      dropped: [],
    })
  })

  it.each([
    ['кавычка', 'x" onclick="alert(1)'],
    ['точка с запятой', '10px; position:fixed'],
    ['угловая скобка', '<b>'],
    ['закрытие тега', '</div><script>alert(1)</script>'],
    ['url()', 'url(x)'],
  ])('отбрасывает значение с опасным символом: %s', (_name, value) => {
    const result = safeStyle([
      ['display', 'flex'],
      ['width', value],
    ])
    expect(result).toEqual({ style: 'display:flex', dropped: ['width'] })
  })

  it('отбрасывает свойство с недопустимым именем', () => {
    const result = safeStyle([
      ['display', 'flex'],
      ['width:1px;x', '1px'],
      ['Width', '1px'],
      ['-x', '1px'],
      ['min--height', '1px'],
      ['height-', '1px'],
    ])
    expect(result).toEqual({
      style: 'display:flex',
      dropped: ['width:1px;x', 'Width', '-x', 'min--height', 'height-'],
    })
  })

  it('пустой список — пустая строка', () => {
    expect(safeStyle([])).toEqual({ style: '', dropped: [] })
  })
})

describe('rootExportEntries', () => {
  it('без флага — ничего', () => {
    expect(rootExportEntries(placement(false))).toEqual([])
  })

  it('с флагом — max-width по ширине превью и margin:0 auto', () => {
    expect(rootExportEntries(placement(true))).toEqual([
      ['max-width', '1440px'],
      ['margin', '0 auto'],
    ])
  })
})

describe('safeTag', () => {
  it('допустимый тег остаётся', () => {
    expect(safeTag('section')).toEqual({ tag: 'section', replaced: false })
  })

  it.each(['script', 'div onclick=x', 'DIV', ''])('недопустимый тег «%s» → div', (tag) => {
    expect(safeTag(tag)).toEqual({ tag: 'div', replaced: true })
  })
})

describe('openTag / closeTag', () => {
  it('атрибут style только при непустом стиле', () => {
    expect(openTag('main', 'display:flex')).toBe('<main style="display:flex">')
    expect(openTag('div', '')).toBe('<div>')
    expect(closeTag('main')).toBe('</main>')
  })
})
