/** Тесты хранилища layout-store: добавление, удаление с выделением, дублирование, updatedAt и отказы. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'

const AT = { x: 10, y: 20 }
const T0 = new Date('2026-01-01T00:00:00.000Z')
const T1 = new Date('2026-01-01T00:00:05.000Z')
const T2 = new Date('2026-01-01T00:00:10.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.useRealTimers()
})

/** Создаёт хранилище с одним корнем и возвращает его вместе с id корня. */
function withRoot() {
  const store = useLayoutStore()
  store.addRoot('flex', 'Корень', AT)
  const rootId = store.document.roots[0]?.node.id ?? ''
  return { store, rootId }
}

/** Возвращает id первого ребёнка первого корня. */
function firstChildId(store: ReturnType<typeof useLayoutStore>): string {
  const root = store.document.roots[0]?.node
  return root?.type === 'block' ? (root.children[0]?.id ?? '') : ''
}

describe('layout-store', () => {
  it('стартует с пустым документом без выделения', () => {
    const store = useLayoutStore()
    expect(store.document.roots).toHaveLength(0)
    expect(store.selectedId).toBeNull()
    expect(store.selectedNode).toBeUndefined()
    expect(store.selectedPath).toEqual([])
  })

  it('добавляет корень и ребёнка', () => {
    const { store, rootId } = withRoot()
    expect(store.addChild(rootId, 'grid', 'Дитя')).toBe(true)
    const root = store.document.roots[0]?.node
    const child = root?.type === 'block' ? root.children[0] : undefined
    expect(child?.type === 'block' && child.label).toBe('Дитя')
    expect(store.rootOf(rootId)?.canvas.x).toBe(AT.x)
  })

  it('selectedNode и selectedPath следуют за выделением', () => {
    const { store, rootId } = withRoot()
    store.addChild(rootId, 'flex', 'Дитя')
    const childId = firstChildId(store)
    store.select(childId)
    expect(store.selectedNode?.id).toBe(childId)
    expect(store.selectedPath.map((n) => n.id)).toEqual([rootId, childId])
    expect(store.rootOf(childId)?.node.id).toBe(rootId)
  })

  it('удаление предка выделенного узла снимает выделение и ховер', () => {
    const { store, rootId } = withRoot()
    store.addChild(rootId, 'flex', 'Дитя')
    const childId = firstChildId(store)
    store.select(childId)
    store.hover(childId)
    expect(store.removeNode(rootId)).toBe(true)
    expect(store.selectedId).toBeNull()
    expect(store.hoveredId).toBeNull()
  })

  it('удаление постороннего узла выделение не трогает', () => {
    const { store, rootId } = withRoot()
    store.addRoot('flex', 'Второй', AT)
    const otherId = store.document.roots[1]?.node.id ?? ''
    store.select(rootId)
    store.removeNode(otherId)
    expect(store.selectedId).toBe(rootId)
  })

  it('duplicateNode выделяет копию', () => {
    const { store, rootId } = withRoot()
    expect(store.duplicateNode(rootId)).toBe(true)
    expect(store.document.roots).toHaveLength(2)
    expect(store.selectedId).toBe(store.document.roots[1]?.node.id)
    expect(store.selectedId).not.toBe(rootId)
  })

  it('недопустимая операция возвращает false и не меняет документ и updatedAt', () => {
    const { store, rootId } = withRoot()
    const before = store.document
    vi.setSystemTime(T1)
    expect(store.addChild('нет-такого', 'flex', 'X')).toBe(false)
    expect(store.removeNode('нет-такого')).toBe(false)
    expect(store.duplicateNode('нет-такого')).toBe(false)
    expect(store.updateNode(rootId, { label: 'Корень' })).toBe(false)
    expect(store.addRoot('flex', 'X', AT, 0)).toBe(false)
    expect(store.document).toBe(before)
    expect(store.document.updatedAt).toBe(T0.toISOString())
  })

  it('updatedAt меняется при каждом изменении', () => {
    const { store, rootId } = withRoot()
    expect(store.document.updatedAt).toBe(T0.toISOString())
    vi.setSystemTime(T1)
    expect(store.updateNode(rootId, { label: 'Новая' })).toBe(true)
    expect(store.document.updatedAt).toBe(T1.toISOString())
    vi.setSystemTime(T2)
    expect(store.updateRootPlacement(rootId, { x: 99 })).toBe(true)
    expect(store.document.updatedAt).toBe(T2.toISOString())
    expect(store.document.roots[0]?.canvas.x).toBe(99)
  })

  it('moveNode переносит узел на канвас корнем', () => {
    const { store, rootId } = withRoot()
    store.addChild(rootId, 'flex', 'Дитя')
    const childId = firstChildId(store)
    expect(store.moveNode(childId, { type: 'canvas', at: { x: 0, y: 0 } })).toBe(true)
    expect(store.document.roots).toHaveLength(2)
  })

  it('select игнорирует несуществующий id, hover принимает id и null', () => {
    const { store, rootId } = withRoot()
    store.select('нет-такого')
    expect(store.selectedId).toBeNull()
    store.hover(rootId)
    expect(store.hoveredId).toBe(rootId)
    store.hover(null)
    expect(store.hoveredId).toBeNull()
  })
})
