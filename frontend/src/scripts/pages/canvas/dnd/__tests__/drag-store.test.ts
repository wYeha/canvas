/** Тесты хранилища перетаскивания: начало, движение указателя, завершение, предпросмотр перемещаемого корня. */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
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
    store.begin({ kind: 'node', nodeId: 'a1', grab, pointer: { x: 10, y: 20 } })
    expect(store.isDragging).toBe(true)
    expect(store.draggingId).toBe('a1')
    expect(store.movingRootId).toBeNull()
    expect(store.rootPosition).toBeNull()
    store.movePointer({ x: 30, y: 40 })
    expect(store.session?.pointer).toEqual({ x: 30, y: 40 })
    expect(store.session).toMatchObject({ kind: 'node', grab })
    store.end()
    expect(store.isDragging).toBe(false)
    expect(store.draggingId).toBeNull()
  })

  it('указатель копируется: внешняя мутация точки не меняет сессию', () => {
    const store = useDragStore()
    const pointer = { x: 10, y: 20 }
    store.begin({ kind: 'node', nodeId: 'a1', grab, pointer })
    pointer.x = 999
    expect(store.session?.pointer.x).toBe(10)
  })

  it('перемещение корня: новая точка по указателю и камере, draggingId пуст', () => {
    const store = useDragStore()
    const camera = useCameraStore()
    camera.camera = { x: 100, y: 50, zoom: 2 }
    store.begin({ kind: 'root', nodeId: 'A', offset: { x: 10, y: -20 }, pointer: { x: 300, y: 250 } })
    expect(store.isDragging).toBe(true)
    expect(store.draggingId).toBeNull()
    expect(store.movingRootId).toBe('A')
    // указатель на поле: ((300-100)/2, (250-50)/2) = (100, 100), минус смещение захвата
    expect(store.rootPosition).toEqual({ x: 90, y: 120 })
    camera.camera = { x: 100, y: 50, zoom: 1 }
    expect(store.rootPosition).toEqual({ x: 190, y: 220 })
  })
})
