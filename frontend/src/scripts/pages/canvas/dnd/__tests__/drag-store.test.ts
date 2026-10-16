/** Тесты хранилища перетаскивания: начало, движение указателя, завершение. */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useDragStore } from '@/scripts/pages/canvas/dnd/drag-store'

const grab = { offset: { x: 5, y: 5 }, size: { width: 100, height: 40 } }

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useDragStore', () => {
  it('без перетаскивания — пусто, движение указателя ничего не создаёт', () => {
    const store = useDragStore()
    store.movePointer({ x: 1, y: 1 })
    expect(store.session).toBeNull()
    expect(store.isDragging).toBe(false)
    expect(store.draggingId).toBeNull()
  })

  it('begin → movePointer → end', () => {
    const store = useDragStore()
    store.begin({ nodeId: 'a1', grab, pointer: { x: 10, y: 20 } })
    expect(store.isDragging).toBe(true)
    expect(store.draggingId).toBe('a1')
    store.movePointer({ x: 30, y: 40 })
    expect(store.session?.pointer).toEqual({ x: 30, y: 40 })
    expect(store.session?.grab).toEqual(grab)
    store.end()
    expect(store.isDragging).toBe(false)
    expect(store.draggingId).toBeNull()
  })

  it('указатель копируется: внешняя мутация точки не меняет сессию', () => {
    const store = useDragStore()
    const pointer = { x: 10, y: 20 }
    store.begin({ nodeId: 'a1', grab, pointer })
    pointer.x = 999
    expect(store.session?.pointer.x).toBe(10)
  })
})
