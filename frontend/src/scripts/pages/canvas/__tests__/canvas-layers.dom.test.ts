/** DOM-тесты панели «Слои»: дерево корней, сворачивание, синхронизация выделения и ховера, центрирование корня. */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import CanvasLayers from '@/views/pages/canvas/CanvasLayers.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует панель; `withDoc` — загрузить документ фикстуры. */
function setup(withDoc = true): VueWrapper {
  const pinia = createPinia()
  setActivePinia(pinia)
  if (withDoc) useLayoutStore().loadDocument(makeDoc())
  mounted = mount(CanvasLayers, { global: { plugins: [pinia] } })
  return mounted
}

/** Подписи видимых строк по порядку. */
function labels(wrapper: VueWrapper): string[] {
  return wrapper.findAll('.canvas-layer-item__label').map((el) => el.text())
}

/** Строка слоя по id узла. */
function row(wrapper: VueWrapper, id: string) {
  return wrapper.find(`[data-layer-id="${id}"]`)
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('CanvasLayers', () => {
  it('без блоков — пустое состояние', () => {
    const wrapper = setup(false)
    expect(wrapper.text()).toContain('Нет блоков')
  })

  it('корни верхним уровнем, внутри деревья; связь — строкой «→ источник»', () => {
    const wrapper = setup()
    expect(labels(wrapper)).toEqual(['A', 'a1', 'a1x', 'a1y', 'a2', '→ B', 'B', 'b1', 'C', 'c1'])
    expect(row(wrapper, 'a1').find('.canvas-layer-item__type').text()).toBe('grid')
    expect(row(wrapper, 'linkB').find('.canvas-layer-item__type').text()).toBe('связь')
  })

  it('шеврон сворачивает и раскрывает ветку', async () => {
    const wrapper = setup()
    const toggle = row(wrapper, 'a1').find('.canvas-layer-item__toggle')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(labels(wrapper)).not.toContain('a1x')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(labels(wrapper)).toContain('a1x')
  })

  it('выделение на канвасе раскрывает свёрнутых предков и подсвечивает строку', async () => {
    const wrapper = setup()
    await row(wrapper, 'A').find('.canvas-layer-item__toggle').trigger('click')
    expect(row(wrapper, 'a1x').exists()).toBe(false)
    useLayoutStore().select('a1x')
    await wrapper.vm.$nextTick()
    expect(row(wrapper, 'a1x').classes()).toContain('canvas-layer-item__row--selected')
    expect(row(wrapper, 'a1x').find('.canvas-layer-item__select').attributes('aria-current')).toBe('true')
  })

  it('ховер на канвасе подсвечивает строку', async () => {
    const wrapper = setup()
    useLayoutStore().hover('b1')
    await wrapper.vm.$nextTick()
    expect(row(wrapper, 'b1').classes()).toContain('canvas-layer-item__row--hovered')
  })

  it('клик по вложенному блоку только выделяет, по корню — ещё и центрирует', async () => {
    const wrapper = setup()
    const camera = useCameraStore()
    camera.setViewportSize({ width: 1400, height: 900 })
    const before = { ...camera.camera }
    await row(wrapper, 'b1').find('.canvas-layer-item__select').trigger('click')
    expect(useLayoutStore().selectedId).toBe('b1')
    expect(camera.camera).toEqual(before)
    await row(wrapper, 'B').find('.canvas-layer-item__select').trigger('click')
    expect(useLayoutStore().selectedId).toBe('B')
    expect(camera.camera).not.toEqual(before)
    expect(camera.camera.zoom).toBe(before.zoom)
  })
})
