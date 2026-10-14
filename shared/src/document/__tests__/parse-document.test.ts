/** Тесты схем документа и parseDocument: валидный документ, битые поля, дубли id, связи, версия схемы. */
import { describe, expect, it } from 'vitest'
import {
  SCHEMA_VERSION,
  blockNodeSchema,
  containerSchema,
  layoutNodeSchema,
  parseDocument,
  type BlockNode,
  type LayoutDocument,
  type LinkNode,
} from '@shared'

/** Собирает минимальный flex-блок с указанными детьми. */
function block(id: string, children: BlockNode['children'] = []): BlockNode {
  return {
    id,
    type: 'block',
    label: id,
    description: '',
    tag: 'div',
    container: { kind: 'flex', direction: 'row', wrap: false, justify: 'flex-start', align: 'stretch', gap: null },
    self: {},
    padding: null,
    repeat: 1,
    children,
  }
}

/** Собирает плашку связи на источник. */
function link(id: string, sourceId: string): LinkNode {
  return { id, type: 'link', sourceId, self: {} }
}

/** Собирает документ из корневых блоков. */
function documentOf(...nodes: BlockNode[]): LayoutDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'doc-1',
    name: 'Дашборд',
    labelCounter: 3,
    roots: nodes.map((node, index) => ({
      canvas: { x: index * 100, y: 0, width: 1440, height: null, exportMaxWidth: false },
      node,
    })),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  }
}

/** Возвращает текст ошибки разбора или падает, если разбор неожиданно успешен. */
function errorOf(data: unknown): string {
  const result = parseDocument(data)
  if (result.ok) throw new Error('Ожидалась ошибка разбора')
  return result.error
}

describe('parseDocument', () => {
  it('принимает валидный документ с вложенностью, grid и связью', () => {
    const grid: BlockNode = {
      ...block('grid'),
      container: {
        kind: 'grid',
        columns: 'repeat(2, 1fr)',
        rows: 'auto',
        justifyItems: 'stretch',
        alignItems: 'stretch',
        columnGap: 8,
        rowGap: null,
      },
      self: { colSpan: 2, flex: '1' },
      padding: { top: 1, right: 2, bottom: 3, left: 4 },
      repeat: 3,
    }
    const doc = documentOf(block('page', [grid, link('l1', 'card')]), block('card'))
    const result = parseDocument(doc)
    expect(result).toEqual({ ok: true, document: doc })
  })

  it('принимает пустой документ', () => {
    expect(parseDocument(documentOf()).ok).toBe(true)
  })

  it('отклоняет не-объект', () => {
    expect(errorOf('строка')).toMatch(/^Документ повреждён/)
    expect(errorOf(null)).toMatch(/^Документ повреждён/)
  })

  it('отклоняет другую версию схемы', () => {
    expect(errorOf({ ...documentOf(), schemaVersion: 2 })).toContain('schemaVersion')
  })

  it('указывает путь к битому полю во вложенном блоке', () => {
    const page = { ...block('page'), children: [{ ...block('child'), tag: 'span' }] }
    expect(errorOf(documentOf(block('other'), page as unknown as BlockNode))).toContain('roots[1].node.children[0].tag')
  })

  it('отклоняет нецелый repeat, отрицательный padding и нулевую ширину превью', () => {
    expect(errorOf(documentOf({ ...block('a'), repeat: 1.5 }))).toContain('repeat')
    expect(errorOf(documentOf({ ...block('a'), padding: { top: -1, right: 0, bottom: 0, left: 0 } }))).toContain(
      'padding.top',
    )
    const doc = documentOf(block('a'))
    const [root] = doc.roots
    if (!root) throw new Error('нет корня')
    expect(errorOf({ ...doc, roots: [{ ...root, canvas: { ...root.canvas, width: 0 } }] })).toContain('canvas.width')
    expect(errorOf({ ...doc, roots: [{ ...root, canvas: { ...root.canvas, height: 0 } }] })).toContain('canvas.height')
    expect(errorOf({ ...doc, roots: [{ ...root, canvas: { ...root.canvas, height: -5 } }] })).toContain('canvas.height')
  })

  it('отклоняет дату не в формате ISO с русским сообщением', () => {
    const error = errorOf({ ...documentOf(), createdAt: 'вчера' })
    expect(error).toContain('createdAt')
    // Сообщения zod локализованы, английского текста быть не должно
    expect(error).not.toMatch(/Invalid/i)
  })

  it('отклоняет повторяющиеся id в разных корневых блоках', () => {
    expect(errorOf(documentOf(block('a', [block('x')]), block('b', [block('x')])))).toContain('Повторяющийся id')
  })

  it('отклоняет связь на несуществующий блок', () => {
    expect(errorOf(documentOf(block('a', [link('l', 'nope')])))).toContain('не корневой блок')
  })

  it('отклоняет связь на вложенный (некорневой) блок', () => {
    const error = errorOf(documentOf(block('a', [block('inner'), link('l', 'inner')])))
    expect(error).toContain('roots[0].node.children[1].sourceId')
  })
})

describe('схемы узлов', () => {
  it('различают flex и grid по kind', () => {
    expect(containerSchema.safeParse({ kind: 'grid', columns: '1fr' }).success).toBe(false)
    expect(containerSchema.safeParse(block('a').container).success).toBe(true)
  })

  it('проверяют детей рекурсивно', () => {
    expect(blockNodeSchema.safeParse(block('a', [block('b', [link('l', 'x')])])).success).toBe(true)
    expect(layoutNodeSchema.safeParse({ ...link('l', 'x'), sourceId: '' }).success).toBe(false)
  })

  it('отклоняют colSpan меньше 1', () => {
    expect(blockNodeSchema.safeParse({ ...block('a'), self: { colSpan: 0 } }).success).toBe(false)
  })
})
