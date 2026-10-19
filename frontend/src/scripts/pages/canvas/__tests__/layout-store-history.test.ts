/** Интеграционные тесты истории в хранилище: создание с подписью, правки панели, удаление/вставка, лимит, выделение. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { HISTORY_LIMIT, HISTORY_MERGE_MS } from '@/scripts/pages/canvas/constants'
import { useLabelEditStore } from '@/scripts/pages/canvas/label-edit-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { findNode } from '@/scripts/pages/canvas/tree-query'
import { createDocument } from '@/scripts/pages/canvas/factories'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  vi.useRealTimers()
})

/** Стор с одним корнем; история после создания корня очищена через loadDocument. */
function storeWithRoot() {
  const store = useLayoutStore()
  const rootId = store.createRoot('flex', { x: 0, y: 0 }, 480) ?? ''
  store.setLabelOrAuto(rootId, 'Корень')
  store.loadDocument(store.document)
  return { store, rootId }
}

/** Подпись узла в текущем документе. */
function labelOf(store: ReturnType<typeof useLayoutStore>, id: string): string | undefined {
  const node = findNode(store.document, id)
  return node?.label
}

describe('создание блока', () => {
  it('создание и подпись — один шаг; отмена убирает блок и возвращает выделение родителю', () => {
    const { store, rootId } = storeWithRoot()
    store.select(rootId)
    const labelEdit = useLabelEditStore()
    const id = store.createChild(rootId, 'grid') ?? ''
    labelEdit.begin(id)
    vi.advanceTimersByTime(HISTORY_MERGE_MS * 10)
    labelEdit.draft = 'Шапка'
    labelEdit.finish()
    expect(labelOf(store, id)).toBe('Шапка')
    expect(store.undo()).toBe(true)
    expect(findNode(store.document, id)).toBeUndefined()
    expect(store.selectedId).toBe(rootId)
    expect(store.canUndo).toBe(false)
    expect(store.redo()).toBe(true)
    expect(labelOf(store, id)).toBe('Шапка')
    expect(store.selectedId).toBe(id)
  })

  it('автоподпись тоже входит в шаг создания, а счётчик при отмене не уменьшается (номера не переиспользуются)', () => {
    const { store } = storeWithRoot()
    const counter = store.document.labelCounter
    const id = store.createRoot('flex', { x: 600, y: 0 }) ?? ''
    store.setLabelOrAuto(id, '')
    expect(store.document.labelCounter).toBe(counter + 1)
    store.undo()
    expect(store.document.labelCounter).toBe(counter + 1)
    expect(store.canUndo).toBe(false)
  })

  it('без выделения отмена создания корня снимает выделение', () => {
    const { store } = storeWithRoot()
    store.select(null)
    store.createRoot('flex', { x: 600, y: 0 })
    store.undo()
    expect(store.selectedId).toBeNull()
  })
})

/** Пишет высоту узла в px, как числовое поле панели (стрелками). */
function setHeight(store: ReturnType<typeof useLayoutStore>, id: string, height: number): void {
  const node = findNode(store.document, id)
  if (node) store.updateNode(id, { self: { ...node.self, height: `${String(height)}px` } })
}

describe('правки панели', () => {
  it('быстрые правки одного поля (стрелки числового поля) склеиваются, после паузы — новый шаг', () => {
    const { store, rootId } = storeWithRoot()
    setHeight(store, rootId, 1)
    vi.advanceTimersByTime(HISTORY_MERGE_MS / 2)
    setHeight(store, rootId, 2)
    vi.advanceTimersByTime(HISTORY_MERGE_MS / 2)
    setHeight(store, rootId, 3)
    vi.advanceTimersByTime(HISTORY_MERGE_MS + 1)
    setHeight(store, rootId, 4)
    store.undo()
    expect(findNode(store.document, rootId)?.self.height).toBe('3px')
    store.undo()
    expect(findNode(store.document, rootId)?.self.height).toBeUndefined()
    expect(store.canUndo).toBe(false)
  })

  it('правки разных полей подряд — разные шаги', () => {
    const { store, rootId } = storeWithRoot()
    store.updateNode(rootId, { label: 'А' })
    store.updateNode(rootId, { tag: 'section' })
    store.undo()
    expect(labelOf(store, rootId)).toBe('А')
    store.undo()
    expect(labelOf(store, rootId)).toBe('Корень')
  })

  it('правки ширины превью подряд склеиваются', () => {
    const { store, rootId } = storeWithRoot()
    store.updateRootPlacement(rootId, { width: 500 })
    store.updateRootPlacement(rootId, { width: 510 })
    store.undo()
    expect(store.document.roots[0]?.canvas.width).toBe(480)
    expect(store.canUndo).toBe(false)
  })

  it('правка без изменений историю не пишет', () => {
    const { store, rootId } = storeWithRoot()
    expect(store.updateNode(rootId, { label: 'Корень' })).toBe(false)
    expect(store.canUndo).toBe(false)
  })
})

describe('удаление и вставка', () => {
  it('отмена удаления возвращает блок и выделение на него', () => {
    const { store, rootId } = storeWithRoot()
    const id = store.createChild(rootId, 'flex') ?? ''
    store.setLabelOrAuto(id, 'Ребёнок')
    store.select(id)
    store.removeNode(id)
    expect(store.selectedId).toBeNull()
    store.undo()
    expect(labelOf(store, id)).toBe('Ребёнок')
    expect(store.selectedId).toBe(id)
  })

  it('вставка — один шаг; при отмене выделение на вставленном снимается', () => {
    const { store, rootId } = storeWithRoot()
    const root = findNode(store.document, rootId)
    if (root === undefined) throw new Error('нет корня')
    const copyId = store.pasteRoot(root, { x: 900, y: 0 }, 480)
    expect(store.selectedId).toBe(copyId)
    store.undo()
    expect(store.document.roots).toHaveLength(1)
    expect(store.selectedId).toBe(null)
  })
})

describe('лимит, повтор и загрузка', () => {
  it('хранится не больше HISTORY_LIMIT шагов', () => {
    const { store, rootId } = storeWithRoot()
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
      // Пауза больше окна: иначе правки одного поля склеятся в один шаг
      vi.advanceTimersByTime(HISTORY_MERGE_MS + 1)
      store.updateNode(rootId, { label: `L${String(i)}` })
    }
    let undone = 0
    while (store.undo()) undone += 1
    expect(undone).toBe(HISTORY_LIMIT)
    expect(labelOf(store, rootId)).toBe('L4')
  })

  it('новое изменение после отмены очищает повтор', () => {
    const { store, rootId } = storeWithRoot()
    store.updateNode(rootId, { label: 'А' })
    store.undo()
    expect(store.canRedo).toBe(true)
    store.updateNode(rootId, { tag: 'main' })
    expect(store.canRedo).toBe(false)
    expect(store.redo()).toBe(false)
  })

  it('loadDocument сбрасывает историю', () => {
    const { store, rootId } = storeWithRoot()
    store.updateNode(rootId, { label: 'А' })
    store.undo()
    store.loadDocument(createDocument())
    expect(store.canUndo).toBe(false)
    expect(store.canRedo).toBe(false)
  })
})

describe('переименование документа', () => {
  it('пустое имя и то же имя — отказ; имя обрезается, updatedAt обновляется', () => {
    const store = useLayoutStore()
    const before = store.document.updatedAt
    vi.setSystemTime(5000)
    expect(store.renameDocument('   ')).toBe(false)
    expect(store.renameDocument(store.document.name)).toBe(false)
    expect(store.document.updatedAt).toBe(before)
    expect(store.renameDocument('  Лендинг  ')).toBe(true)
    expect(store.document.name).toBe('Лендинг')
    expect(store.document.updatedAt).not.toBe(before)
  })

  it('не попадает в историю: undo/redo не меняют название', () => {
    const { store } = storeWithRoot()
    store.createRoot('flex', { x: 0, y: 0 }, 480)
    expect(store.renameDocument('Новое')).toBe(true)
    expect(store.canUndo).toBe(true)
    store.undo()
    expect(store.document.name).toBe('Новое')
    store.redo()
    expect(store.document.name).toBe('Новое')
  })
})

describe('счётчик автоподписей', () => {
  it('отмена не откатывает счётчик: create → undo → create даёт следующий номер, а не повтор', () => {
    const store = useLayoutStore()
    const first = store.createRoot('flex', { x: 0, y: 0 }, 480) ?? ''
    store.setLabelOrAuto(first, '')
    expect(store.document.roots[0]?.node.label).toBe('Блок-1')
    store.undo()
    expect(store.document.labelCounter).toBe(1)
    const second = store.createRoot('flex', { x: 0, y: 0 }, 480) ?? ''
    store.setLabelOrAuto(second, '')
    expect(store.document.roots[0]?.node.label).toBe('Блок-2')
  })
})
