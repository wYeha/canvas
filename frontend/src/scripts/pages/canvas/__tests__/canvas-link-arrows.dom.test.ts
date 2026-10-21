/**
 * DOM-тесты стрелок связей (16.6): по умолчанию стрелка видна только у выделенной связи или её источника,
 * переключатель «все стрелки» показывает все. Замеры блоков подменяются: в тестовом DOM они нулевые.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createLinkBlock } from '@/scripts/pages/canvas/factories'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { addChild } from '@/scripts/pages/canvas/tree'
import { useViewSettingsStore } from '@/scripts/pages/canvas/view-settings-store'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper | null = null

/** Прямоугольники по id узла: источник C справа, плашка lC слева, остальное — в начале координат. */
const RECTS: Record<string, DOMRect> = { C: new DOMRect(1000, 0, 200, 100), lC: new DOMRect(0, 0, 100, 40) }

/** Подменённый замер: по `data-node-id` элемента. */
function rectOf(this: Element): DOMRect {
  return RECTS[this.getAttribute('data-node-id') ?? ''] ?? new DOMRect(0, 0, 0, 0)
}

/** Монтирует поле: связь lC на корень C внутри a2. */
async function setup(): Promise<VueWrapper> {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(rectOf)
  const pinia = createPinia()
  setActivePinia(pinia)
  useLayoutStore().loadDocument(addChild(makeDoc(), 'a2', { ...createLinkBlock('C'), id: 'lC' }))
  mounted = mount(CanvasViewport, { global: { plugins: [pinia] }, attachTo: document.body })
  await flushPromises()
  return mounted
}

/** Число отрисованных стрелок. */
function arrows(wrapper: VueWrapper): number {
  return wrapper.findAll('.canvas-links__arrow').length
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('стрелки связей у выделенных', () => {
  it('без выделения стрелок нет; у выделенной связи или источника — есть', async () => {
    const wrapper = await setup()
    expect(arrows(wrapper)).toBe(0)
    useLayoutStore().select('lC')
    await flushPromises()
    expect(arrows(wrapper)).toBe(1)
    useLayoutStore().select('C')
    await flushPromises()
    expect(arrows(wrapper)).toBe(1)
    useLayoutStore().select('b1')
    await flushPromises()
    expect(arrows(wrapper)).toBe(0)
  })

  it('«все стрелки» показывает стрелки без выделения', async () => {
    const wrapper = await setup()
    useViewSettingsStore().toggleLinkArrowsAll()
    await flushPromises()
    expect(arrows(wrapper)).toBe(1)
  })
})
