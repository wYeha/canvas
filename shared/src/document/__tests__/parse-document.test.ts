/** Тесты схем документа и parseDocument: валидный документ, битые поля, дубли id, отбрасывание старых плашек, padding и gap, версия схемы. */
import { describe, expect, it } from 'vitest'
import {
  SCHEMA_VERSION,
  blockNodeSchema,
  containerSchema,
  parseDocument,
  type BlockNode,
  type LayoutDocument,
} from '@shared'

/** Собирает минимальный flex-блок с указанными детьми. */
function block(id: string, children: BlockNode['children'] = []): BlockNode {
  return {
    id,
    type: 'block',
    label: id,
    description: '',
    tag: 'div',
    container: { kind: 'flex', direction: 'row', wrap: false, justify: 'flex-start', align: 'stretch' },
    self: {},
    repeat: 1,
    children,
  }
}

/** Собирает узел-плашку старого формата (до 8.1), который при разборе становится блоком-связью. */
function legacyLink(id: string, sourceId: string): Record<string, unknown> {
  return { id, type: 'link', sourceId, self: { flex: '1' } }
}

/** Собирает документ из корневых блоков. */
function documentOf(...nodes: BlockNode[]): LayoutDocument {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'doc-1',
    name: 'Дашборд',
    rules: '',
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
  it('принимает валидный документ с вложенностью и grid', () => {
    const grid: BlockNode = {
      ...block('grid'),
      container: {
        kind: 'grid',
        columns: 'repeat(2, 1fr)',
        rows: 'auto',
        justifyItems: 'stretch',
        alignItems: 'stretch',
      },
      self: { colSpan: 2, flex: '1' },
      repeat: 3,
    }
    const doc = documentOf(block('page', [grid]), block('card'))
    const result = parseDocument(doc)
    expect(result).toEqual({ ok: true, document: doc })
  })

  it('документ без правил (старый) получает пустые правила', () => {
    const old: Record<string, unknown> = { ...documentOf() }
    Reflect.deleteProperty(old, 'rules')
    const result = parseDocument(old)
    if (!result.ok) throw new Error(result.error)
    expect(result.document.rules).toBe('')
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

  it('отклоняет нецелый repeat и нулевую ширину превью', () => {
    expect(errorOf(documentOf({ ...block('a'), repeat: 1.5 }))).toContain('repeat')
    const doc = documentOf(block('a'))
    const [root] = doc.roots
    if (!root) throw new Error('нет корня')
    expect(errorOf({ ...doc, roots: [{ ...root, canvas: { ...root.canvas, width: 0 } }] })).toContain('canvas.width')
    expect(errorOf({ ...doc, roots: [{ ...root, canvas: { ...root.canvas, height: 0 } }] })).toContain('canvas.height')
    expect(errorOf({ ...doc, roots: [{ ...root, canvas: { ...root.canvas, height: -5 } }] })).toContain('canvas.height')
  })

  it('repeat корня из импорта сводится к 1 при разборе; вложенные блоки не затрагиваются', () => {
    const result = parseDocument(documentOf({ ...block('page', [{ ...block('kid'), repeat: 4 }]), repeat: 5 }))
    if (!result.ok) throw new Error(result.error)
    const [entry] = result.document.roots
    expect(entry?.node.repeat).toBe(1)
    expect(entry?.node.children[0]?.repeat).toBe(4)
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
})

describe('миграция старых документов', () => {
  it('плашки старого формата становятся блоками-связями с тем же id, источником и self', () => {
    const page = { ...block('a'), children: [legacyLink('l1', 'b'), block('leaf')] }
    const result = parseDocument(documentOf(page as unknown as BlockNode, block('b')))
    if (!result.ok) throw new Error(result.error)
    const link = result.document.roots[0]?.node.children[0]
    expect(link).toMatchObject({ id: 'l1', type: 'block', sourceId: 'b', self: { flex: '1' }, repeat: 1, children: [] })
  })

  it('старая плашка на несуществующий корень — понятная ошибка', () => {
    const page = { ...block('a'), children: [legacyLink('l', 'nope')] }
    expect(errorOf(documentOf(page as unknown as BlockNode))).toContain('которого нет на поле')
  })

  it('молча отбрасывает поле padding на любой глубине, в том числе битое', () => {
    const legacyPadding = { top: 1, right: 2, bottom: 3, left: 4 }
    const leaf = { ...block('leaf'), padding: { top: -1 } }
    const inner = { ...block('inner'), padding: null, children: [leaf] }
    const page = { ...block('a'), padding: legacyPadding, children: [inner] }
    const result = parseDocument(documentOf(page))
    expect(result).toEqual({ ok: true, document: documentOf(block('a', [block('inner', [block('leaf')])])) })
    if (!result.ok) throw new Error('документ не разобран')
    expect(result.document.roots[0]?.node).not.toHaveProperty('padding')
  })
})

describe('связи', () => {
  /** Блок-связь на корень `sourceId`. */
  function link(id: string, sourceId: string): BlockNode {
    return { ...block(id), sourceId }
  }

  it('принимает связь на существующий корень', () => {
    expect(parseDocument(documentOf(block('a', [link('l', 'b')]), block('b'))).ok).toBe(true)
  })

  it('отклоняет связь на несуществующий корень и на вложенный блок', () => {
    expect(errorOf(documentOf(block('a', [link('l', 'nope')])))).toContain('которого нет на поле')
    expect(errorOf(documentOf(block('a', [link('l', 'inner')]), block('b', [block('inner')])))).toContain(
      'которого нет на поле',
    )
  })

  it('отклоняет связь с детьми и корень-связь', () => {
    expect(errorOf(documentOf(block('a', [{ ...link('l', 'b'), children: [block('x')] }]), block('b')))).toContain(
      'не может быть вложенных блоков',
    )
    expect(errorOf(documentOf(link('a', 'b'), block('b')))).toContain('Корневой блок не может быть связью')
  })

  it('отклоняет циклы: на свой корень, взаимные и через цепочку', () => {
    expect(errorOf(documentOf(block('a', [link('l', 'a')])))).toContain('замыкает цикл')
    expect(errorOf(documentOf(block('a', [link('l1', 'b')]), block('b', [link('l2', 'a')])))).toContain('замыкает цикл')
    const chain = documentOf(
      block('a', [link('l1', 'b')]),
      block('b', [link('l2', 'c')]),
      block('c', [link('l3', 'a')]),
    )
    expect(errorOf(chain)).toContain('замыкает цикл')
  })

  it('один источник в нескольких местах и цепочка без цикла допустимы', () => {
    const doc = documentOf(
      block('a', [link('l1', 'c'), block('x', [link('l2', 'c')])]),
      block('b', [link('l3', 'c')]),
      block('c'),
    )
    expect(parseDocument(doc).ok).toBe(true)
  })
})

describe('отбрасывание gap', () => {
  it('молча отбрасывает gap, columnGap и rowGap старых документов, в том числе битые', () => {
    const flexWithGap = { ...block('a'), container: { ...block('a').container, gap: 24 } }
    const gridWithGap = {
      ...block('g'),
      container: {
        kind: 'grid',
        columns: '1fr',
        rows: 'auto',
        justifyItems: 'stretch',
        alignItems: 'stretch',
        columnGap: -5,
        rowGap: 'x',
      },
    }
    const result = parseDocument(documentOf({ ...flexWithGap, children: [gridWithGap] } as unknown as BlockNode))
    if (!result.ok) throw new Error(result.error)
    const root = result.document.roots[0]?.node
    // Числовой gap до 8.4 — «без зазора»: значение undefined, при сохранении ключ исчезает
    expect(root?.container.gap).toBeUndefined()
    expect(JSON.parse(JSON.stringify(root?.container))).not.toHaveProperty('gap')
    expect(root?.children[0]?.container).not.toHaveProperty('columnGap')
    expect(root?.children[0]?.container).not.toHaveProperty('rowGap')
  })

  it('принимает gap токеном s/m/l', () => {
    const doc = documentOf({ ...block('a'), container: { ...block('a').container, gap: 'm' } })
    const result = parseDocument(doc)
    if (!result.ok) throw new Error(result.error)
    expect(result.document.roots[0]?.node.container.gap).toBe('m')
  })

  it('смысловой элемент: имя принимается, недопустимое отбрасывается', () => {
    const ok = parseDocument(documentOf({ ...block('a'), element: 'h1' }))
    if (!ok.ok) throw new Error(ok.error)
    expect(ok.document.roots[0]?.node.element).toBe('h1')
    const bad = parseDocument(documentOf({ ...block('a'), element: '<script>' }))
    if (!bad.ok) throw new Error(bad.error)
    expect(bad.document.roots[0]?.node.element).toBeUndefined()
  })

  it('положение: значение из списка принимается, мусор отбрасывается', () => {
    const ok = parseDocument(documentOf({ ...block('a'), self: { position: 'sticky-top' } }))
    if (!ok.ok) throw new Error(ok.error)
    expect(ok.document.roots[0]?.node.self.position).toBe('sticky-top')
    const bad = parseDocument(documentOf({ ...block('a'), self: { position: 'fixed' } } as unknown as BlockNode))
    if (!bad.ok) throw new Error(bad.error)
    expect(bad.document.roots[0]?.node.self.position).toBeUndefined()
  })

  it('прокрутка: ось y/x принимается, мусор — без прокрутки', () => {
    const ok = parseDocument(documentOf({ ...block('a'), container: { ...block('a').container, scroll: 'y' } }))
    if (!ok.ok) throw new Error(ok.error)
    expect(ok.document.roots[0]?.node.container.scroll).toBe('y')
    const bad = parseDocument(
      documentOf({ ...block('a'), container: { ...block('a').container, scroll: 'auto' } } as unknown as BlockNode),
    )
    if (!bad.ok) throw new Error(bad.error)
    expect(bad.document.roots[0]?.node.container.scroll).toBeUndefined()
  })
})

describe('режимы размера и экран целиком', () => {
  it('принимает режимы ширины/высоты, min/max-width и fullScreen корня', () => {
    const child = { ...block('c'), self: { widthMode: 'fill', heightMode: 'fixed', minWidth: '0', maxWidth: '640px' } }
    const doc = documentOf(block('a', [child as BlockNode]))
    const [root] = doc.roots
    if (!root) throw new Error('нет корня')
    const result = parseDocument({ ...doc, roots: [{ ...root, canvas: { ...root.canvas, fullScreen: true } }] })
    if (!result.ok) throw new Error(result.error)
    expect(result.document.roots[0]?.node.children[0]?.self).toEqual(child.self)
    expect(result.document.roots[0]?.canvas.fullScreen).toBe(true)
  })

  it('отклоняет неизвестный режим размера', () => {
    expect(
      errorOf(documentOf(block('a', [{ ...block('c'), self: { widthMode: 'stretch' } } as unknown as BlockNode]))),
    ).toContain('widthMode')
  })
})

describe('схемы узлов', () => {
  it('различают flex и grid по kind', () => {
    expect(containerSchema.safeParse({ kind: 'grid', columns: '1fr' }).success).toBe(false)
    expect(containerSchema.safeParse(block('a').container).success).toBe(true)
  })

  it('проверяют детей рекурсивно', () => {
    expect(blockNodeSchema.safeParse(block('a', [block('b', [block('c')])])).success).toBe(true)
    expect(blockNodeSchema.safeParse(block('a', [block('b', [{ ...block('c'), id: '' }])])).success).toBe(false)
  })

  it('отклоняют colSpan меньше 1', () => {
    expect(blockNodeSchema.safeParse({ ...block('a'), self: { colSpan: 0 } }).success).toBe(false)
  })
})

describe('небезопасные CSS-строки', () => {
  /** Grid-блок с заданными шаблонами. */
  const grid = (columns: string, rows = 'auto'): BlockNode => ({
    ...block('g'),
    container: {
      kind: 'grid',
      columns,
      rows,
      justifyItems: 'stretch',
      alignItems: 'stretch',
    },
  })

  it('отклоняет импорт с инъекцией в columns и rows', () => {
    const error = errorOf(documentOf(grid('1fr; color:red')))
    expect(error).toContain('columns')
    expect(error).toContain('Недопустимое CSS-значение')
    expect(errorOf(documentOf(grid('1fr', '1fr}')))).toContain('rows')
    expect(errorOf(documentOf(grid('calc(100%')))).toContain('columns')
  })

  it.each(['flex', 'width', 'height', 'minHeight'] as const)('отклоняет небезопасное self.%s', (key) => {
    const error = errorOf(documentOf({ ...block('a'), self: { [key]: '1fr; color:red' } }))
    expect(error).toContain(`self.${key}`)
  })

  it('принимает безопасные значения', () => {
    expect(parseDocument(documentOf(grid('repeat(2, 1fr)'))).ok).toBe(true)
    expect(
      parseDocument(documentOf({ ...block('a'), self: { width: 'calc(100% - 8px)', flex: '0 0 280px' } })).ok,
    ).toBe(true)
  })
})
