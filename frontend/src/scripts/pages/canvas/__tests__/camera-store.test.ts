/** Тесты хранилища камеры: ступени зума к центру видимой области, сброс, вписывание всех корней, замеры высот. */
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { areaCenter, screenToWorld, worldToScreen } from '@/scripts/pages/canvas/camera'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import { DEFAULT_CAMERA, FIT_PADDING, ZOOM_MAX } from '@/scripts/pages/canvas/constants'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'

const VIEWPORT = { width: 1400, height: 800 }

beforeEach(() => {
  setActivePinia(createPinia())
})

/** Создаёт стор камеры с измеренным viewport. */
function measuredStore() {
  const store = useCameraStore()
  store.setViewportSize(VIEWPORT)
  return store
}

describe('camera-store', () => {
  it('начальная камера и подпись', () => {
    const store = useCameraStore()
    expect(store.camera).toEqual(DEFAULT_CAMERA)
    expect(store.zoomLabel).toBe('100%')
  })

  it('zoomIn сохраняет мировую точку в центре видимой области', () => {
    const store = measuredStore()
    store.panBy(-37, 15)
    const center = areaCenter(store.visibleArea)
    const world = screenToWorld(store.camera, center)
    store.zoomIn()
    expect(store.camera.zoom).toBe(1.5)
    const after = worldToScreen(store.camera, world)
    expect(after.x).toBeCloseTo(center.x, 6)
    expect(after.y).toBeCloseTo(center.y, 6)
  })

  it('zoomOut переходит на предыдущую ступень', () => {
    const store = measuredStore()
    store.zoomOut()
    expect(store.camera.zoom).toBe(0.75)
    expect(store.zoomLabel).toBe('75%')
  })

  it('zoomIn на 400% не меняет камеру', () => {
    const store = measuredStore()
    store.zoomAtPoint({ x: 10, y: 10 }, ZOOM_MAX)
    const before = store.camera
    store.zoomIn()
    expect(store.camera).toEqual(before)
  })

  it('resetZoom возвращает 100%', () => {
    const store = measuredStore()
    store.zoomAtPoint({ x: 10, y: 10 }, 2.7)
    store.resetZoom()
    expect(store.camera.zoom).toBe(1)
  })

  it('fitAll на пустом документе — начальная камера', () => {
    const store = measuredStore()
    store.panBy(100, 200)
    store.zoomIn()
    store.fitAll()
    expect(store.camera).toEqual(DEFAULT_CAMERA)
  })

  it('fitAll вписывает корень целиком в видимую область', () => {
    const layout = useLayoutStore()
    layout.addRoot('flex', 'Корень', { x: -300, y: 400 })
    const root = layout.document.roots[0]
    if (root === undefined) throw new Error('корень не добавлен')
    const store = measuredStore()
    store.setRootHeight(root.node.id, 900)
    store.fitAll()
    const area = store.visibleArea
    const topLeft = worldToScreen(store.camera, { x: root.canvas.x, y: root.canvas.y })
    const bottomRight = worldToScreen(store.camera, {
      x: root.canvas.x + root.canvas.width,
      y: root.canvas.y + 900,
    })
    expect(store.camera.zoom).toBeLessThan(1)
    expect(topLeft.x).toBeGreaterThanOrEqual(area.x + FIT_PADDING - 1e-6)
    expect(topLeft.y).toBeGreaterThanOrEqual(area.y + FIT_PADDING - 1e-6)
    expect(bottomRight.x).toBeLessThanOrEqual(area.x + area.width - FIT_PADDING + 1e-6)
    expect(bottomRight.y).toBeLessThanOrEqual(area.y + area.height - FIT_PADDING + 1e-6)
  })

  it('fitAll при неизмеренном viewport не меняет камеру', () => {
    useLayoutStore().addRoot('flex', 'Корень', { x: 0, y: 0 })
    const store = useCameraStore()
    store.panBy(10, 20)
    const before = store.camera
    store.fitAll()
    expect(store.camera).toBe(before)
  })

  it('setRootHeight влияет на fitAll, removeRootHeight его отменяет', () => {
    const layout = useLayoutStore()
    layout.addRoot('flex', 'Корень', { x: 0, y: 0 }, 400)
    const id = layout.document.roots[0]?.node.id ?? ''
    const store = measuredStore()
    store.fitAll()
    const flat = store.camera
    store.setRootHeight(id, 5000)
    store.fitAll()
    expect(store.camera.zoom).toBeLessThan(flat.zoom)
    store.removeRootHeight(id)
    store.fitAll()
    expect(store.camera).toEqual(flat)
  })
})
