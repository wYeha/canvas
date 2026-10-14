/** Тесты фабрик модели: значения по умолчанию, уникальные id и соответствие схемам из @shared. */
import { describe, expect, it } from 'vitest'
import { blockNodeSchema, containerSchema, linkNodeSchema, parseDocument, rootEntrySchema } from '@shared'
import {
  createBlock,
  createDocument,
  createFlexContainer,
  createGridContainer,
  createLink,
  createRootEntry,
  nextAutoLabel,
} from '@/scripts/pages/canvas/factories'

describe('контейнеры', () => {
  it('flex по умолчанию: row, без переноса, flex-start, stretch, без gap', () => {
    const container = createFlexContainer()
    expect(container).toEqual({
      kind: 'flex',
      direction: 'row',
      wrap: false,
      justify: 'flex-start',
      align: 'stretch',
      gap: null,
    })
    expect(containerSchema.safeParse(container).success).toBe(true)
  })

  it('grid по умолчанию: две равные колонки, stretch, без gap', () => {
    const container = createGridContainer()
    expect(container).toEqual({
      kind: 'grid',
      columns: 'repeat(2, 1fr)',
      rows: 'auto',
      justifyItems: 'stretch',
      alignItems: 'stretch',
      columnGap: null,
      rowGap: null,
    })
    expect(containerSchema.safeParse(container).success).toBe(true)
  })

  it('каждый вызов возвращает новый объект', () => {
    expect(createFlexContainer()).not.toBe(createFlexContainer())
  })
})

describe('createBlock', () => {
  it('создаёт пустой блок нужного вида', () => {
    const block = createBlock('grid', 'Карточки')
    expect(block).toMatchObject({
      type: 'block',
      label: 'Карточки',
      description: '',
      tag: 'div',
      self: {},
      padding: null,
      repeat: 1,
      children: [],
    })
    expect(block.container.kind).toBe('grid')
    expect(createBlock('flex', '').container.kind).toBe('flex')
    expect(blockNodeSchema.safeParse(block).success).toBe(true)
  })

  it('выдаёт разные id', () => {
    expect(createBlock('flex', 'a').id).not.toBe(createBlock('flex', 'a').id)
  })
})

describe('createLink', () => {
  it('создаёт плашку связи на источник', () => {
    const link = createLink('source-id')
    expect(link).toMatchObject({ type: 'link', sourceId: 'source-id', self: {} })
    expect(linkNodeSchema.safeParse(link).success).toBe(true)
  })
})

describe('createRootEntry', () => {
  it('flex-корень раскладывает детей в колонку, ширина превью 1440 по умолчанию', () => {
    const root = createRootEntry('flex', 'Страница', { x: 10, y: 20 })
    expect(root.canvas).toEqual({ x: 10, y: 20, width: 1440, height: null, exportMaxWidth: false })
    expect(root.node.container).toMatchObject({ kind: 'flex', direction: 'column' })
    expect(rootEntrySchema.safeParse(root).success).toBe(true)
  })

  it('принимает свою ширину и создаёт grid-корень', () => {
    const root = createRootEntry('grid', 'Карточка', { x: 0, y: 0 }, 480)
    expect(root.canvas.width).toBe(480)
    expect(root.node.container.kind).toBe('grid')
  })
})

describe('createDocument', () => {
  it('создаёт пустой документ с названием по умолчанию', () => {
    const doc = createDocument()
    expect(doc).toMatchObject({ schemaVersion: 1, name: 'Без названия', labelCounter: 0, roots: [] })
    expect(doc.createdAt).toBe(doc.updatedAt)
    expect(parseDocument(doc).ok).toBe(true)
  })

  it('документ с корнями и связью проходит parseDocument', () => {
    const card = createRootEntry('grid', 'Карточка', { x: 0, y: 0 }, 480)
    const page = createRootEntry('flex', 'Страница', { x: 600, y: 0 })
    page.node.children.push(createBlock('flex', 'Шапка'), createLink(card.node.id))
    const doc = { ...createDocument('Дашборд'), roots: [card, page] }
    expect(parseDocument(doc)).toEqual({ ok: true, document: doc })
  })
})

describe('nextAutoLabel', () => {
  it('возвращает следующий номер и не меняет документ', () => {
    const doc = createDocument()
    expect(nextAutoLabel(doc)).toEqual({ label: 'Блок-1', labelCounter: 1 })
    expect(nextAutoLabel({ ...doc, labelCounter: 41 })).toEqual({ label: 'Блок-42', labelCounter: 42 })
    expect(doc.labelCounter).toBe(0)
  })
})
