/** Тесты внутреннего буфера блоков, вставки в хранилище и переименования подписи. */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { parseDocument } from '@shared'
import { useLabelEditStore } from '@/scripts/pages/canvas/label-edit-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { useNodeClipboardStore } from '@/scripts/pages/canvas/node-clipboard-store'
import { block, makeDoc } from './tree-fixture'

beforeEach(() => {
  setActivePinia(createPinia())
})

/** Хранилище с загруженным тестовым документом. */
function loadedStore() {
  const store = useLayoutStore()
  expect(store.loadDocument(makeDoc()).ok).toBe(true)
  return store
}

/** Подпись блока a2 (второй ребёнок корня A). */
function a2Label(store: ReturnType<typeof useLayoutStore>): string {
  const a = store.document.roots[0]?.node
  const a2 = a?.children[1]
  return a2?.label ?? ''
}

describe('буфер блоков', () => {
  it('copy кладёт узел, clear очищает', () => {
    const clip = useNodeClipboardStore()
    expect(clip.hasContent).toBe(false)
    clip.copy(block('x', 'flex'), 480)
    expect(clip.hasContent).toBe(true)
    expect(clip.entry?.rootWidth).toBe(480)
    clip.clear()
    expect(clip.entry).toBeNull()
  })
})

describe('pasteChild / pasteRoot', () => {
  it('pasteChild: копия с новыми id, выделяется, документ валиден', () => {
    const store = loadedStore()
    const a = store.document.roots[0]?.node
    const source = a?.children[0]
    if (source === undefined) throw new Error('нет a1')
    const id = store.pasteChild('b1', source)
    expect(id).not.toBeNull()
    expect(id).not.toBe(source.id)
    expect(store.selectedId).toBe(id)
    expect(parseDocument(store.document).ok).toBe(true)
  })

  it('pasteChild в несуществующий блок - null, документ не меняется', () => {
    const store = loadedStore()
    const before = store.document
    expect(store.pasteChild('nope', block('x', 'flex'))).toBeNull()
    expect(store.document).toBe(before)
  })

  it('pasteRoot: новый корень в точке', () => {
    const store = loadedStore()
    const id = store.pasteRoot(block('x', 'grid'), { x: 7, y: 8 }, 321)
    expect(store.document.roots.at(-1)?.canvas).toMatchObject({ x: 7, y: 8, width: 321 })
    expect(store.selectedId).toBe(id)
    expect(parseDocument(store.document).ok).toBe(true)
  })

  it('вставка корня, который уже есть в документе, даёт копию с новыми id', () => {
    const store = loadedStore()
    const a = store.document.roots[0]?.node
    if (a === undefined) throw new Error('нет A')
    const id = store.pasteRoot(a, { x: 0, y: 0 }, 480)
    expect(id).not.toBeNull()
    expect(id).not.toBe('A')
    expect(parseDocument(store.document).ok).toBe(true)
  })
})

describe('переименование', () => {
  it('Enter записывает обрезанную подпись, автоподпись не используется', () => {
    const store = loadedStore()
    const edit = useLabelEditStore()
    edit.beginRename('a2', 'a2')
    expect(edit.draft).toBe('a2')
    edit.draft = '  Подвал '
    edit.finish()
    expect(a2Label(store)).toBe('Подвал')
    expect(store.document.labelCounter).toBe(0)
  })

  it('пустое значение и Esc откатывают подпись, счётчик не растёт', () => {
    const store = loadedStore()
    const edit = useLabelEditStore()
    edit.beginRename('a2', 'a2')
    edit.draft = '   '
    edit.finish()
    expect(a2Label(store)).toBe('a2')
    edit.beginRename('a2', 'a2')
    edit.draft = 'Другая'
    edit.cancel()
    expect(a2Label(store)).toBe('a2')
    expect(store.document.labelCounter).toBe(0)
    expect(edit.editingId).toBeNull()
  })

  it('создание по-прежнему даёт автоподпись при Esc', () => {
    const store = useLayoutStore()
    const edit = useLabelEditStore()
    const id = store.createRoot('flex', { x: 0, y: 0 }) ?? ''
    edit.begin(id)
    edit.cancel()
    expect(store.document.roots[0]?.node.label).toBe('Блок-1')
  })
})

describe('label-edit-store: место переименования', () => {
  it('F2 открывает поле в «Слоях» только для блока, выбранного там последним кликом', () => {
    loadedStore()
    const edit = useLabelEditStore()
    expect(edit.renamePlaceFor('a2')).toBe('canvas')
    edit.pickInLayers('a2')
    expect(edit.renamePlaceFor('a2')).toBe('layers')
    expect(edit.renamePlaceFor('a1')).toBe('canvas')
    edit.pickInLayers(null)
    expect(edit.renamePlaceFor('a2')).toBe('canvas')
  })

  it('место ввода сбрасывается на канвас после завершения', () => {
    loadedStore()
    const edit = useLabelEditStore()
    edit.beginRename('a2', 'a2', 'layers')
    expect(edit.place).toBe('layers')
    edit.finish()
    expect(edit.place).toBe('canvas')
  })
})
