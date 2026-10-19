/** Тесты создания блоков и подписей в хранилищах: createRoot/createChild, setLabelOrAuto, ввод подписи. */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLabelEditStore } from '@/scripts/pages/canvas/label-edit-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('createRoot / createChild', () => {
  it('createRoot добавляет корень с пустой подписью и выделяет его', () => {
    const store = useLayoutStore()
    const id = store.createRoot('grid', { x: 5, y: 6 }, 480)
    expect(id).not.toBeNull()
    expect(store.selectedId).toBe(id)
    expect(store.document.roots[0]?.canvas).toMatchObject({ x: 5, y: 6, width: 480 })
    expect(store.document.roots[0]?.node.label).toBe('')
    expect(store.document.labelCounter).toBe(0)
  })

  it('createChild добавляет последним ребёнком и выделяет его', () => {
    const store = useLayoutStore()
    const rootId = store.createRoot('flex', { x: 0, y: 0 }) ?? ''
    const first = store.createChild(rootId, 'flex')
    const second = store.createChild(rootId, 'grid')
    const root = store.document.roots[0]?.node
    expect(root?.children.map((c) => c.id) ?? []).toEqual([first, second])
    expect(store.selectedId).toBe(second)
  })

  it('createChild в несуществующий блок — null, выделение прежнее', () => {
    const store = useLayoutStore()
    const rootId = store.createRoot('flex', { x: 0, y: 0 })
    expect(store.createChild('nope', 'flex')).toBeNull()
    expect(store.selectedId).toBe(rootId)
  })
})

describe('setLabelOrAuto', () => {
  it('непустая подпись записывается обрезанной, счётчик не растёт', () => {
    const store = useLayoutStore()
    const id = store.createRoot('flex', { x: 0, y: 0 }) ?? ''
    expect(store.setLabelOrAuto(id, '  Шапка ')).toBe(true)
    expect(store.document.roots[0]?.node.label).toBe('Шапка')
    expect(store.document.labelCounter).toBe(0)
  })

  it('пустая подпись заменяется Блок-N, счётчик растёт и номера не переиспользуются', () => {
    const store = useLayoutStore()
    const a = store.createRoot('flex', { x: 0, y: 0 }) ?? ''
    const b = store.createChild(a, 'flex') ?? ''
    store.setLabelOrAuto(a, '   ')
    store.setLabelOrAuto(b, '')
    const root = store.document.roots[0]?.node
    expect(root?.label ?? '').toBe('Блок-1')
    const child = root?.children[0]
    expect(child?.label ?? '').toBe('Блок-2')
    expect(store.document.labelCounter).toBe(2)
  })

  it('несуществующий блок: документ и счётчик не меняются', () => {
    const store = useLayoutStore()
    expect(store.setLabelOrAuto('nope', '')).toBe(false)
    expect(store.document.labelCounter).toBe(0)
  })
})

describe('label-edit-store', () => {
  it('begin + finish применяет черновик', () => {
    const layout = useLayoutStore()
    const edit = useLabelEditStore()
    const id = layout.createRoot('flex', { x: 0, y: 0 }) ?? ''
    edit.begin(id)
    edit.draft = 'Карточка'
    edit.finish()
    expect(layout.document.roots[0]?.node.label).toBe('Карточка')
    expect(edit.editingId).toBeNull()
  })

  it('cancel даёт автоподпись независимо от черновика', () => {
    const layout = useLayoutStore()
    const edit = useLabelEditStore()
    const id = layout.createRoot('flex', { x: 0, y: 0 }) ?? ''
    edit.begin(id)
    edit.draft = 'не важно'
    edit.cancel()
    expect(layout.document.roots[0]?.node.label).toBe('Блок-1')
  })

  it('повторный finish ничего не делает', () => {
    const layout = useLayoutStore()
    const edit = useLabelEditStore()
    const id = layout.createRoot('flex', { x: 0, y: 0 }) ?? ''
    edit.begin(id)
    edit.finish()
    edit.finish()
    expect(layout.document.labelCounter).toBe(1)
  })

  it('begin нового блока завершает предыдущий ввод', () => {
    const layout = useLayoutStore()
    const edit = useLabelEditStore()
    const a = layout.createRoot('flex', { x: 0, y: 0 }) ?? ''
    edit.begin(a)
    edit.draft = 'Первый'
    const b = layout.createRoot('flex', { x: 600, y: 0 }) ?? ''
    edit.begin(b)
    expect(layout.document.roots[0]?.node.label).toBe('Первый')
    expect(edit.editingId).toBe(b)
    expect(edit.draft).toBe('')
  })
})
