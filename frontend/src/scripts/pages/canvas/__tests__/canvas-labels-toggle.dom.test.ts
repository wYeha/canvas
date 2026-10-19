/**
 * DOM-тесты переключателя «Показывать подписи»: кнопка в плашке зума (aria-pressed, подсказка), модификатор поля,
 * двойной клик по скрытой подписи не открывает переименование, заголовок корня остаётся.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Component } from 'vue'
import { useLabelEditStore } from '@/scripts/pages/canvas/label-edit-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { VIEWPORT_LABELS_HIDDEN_CLASS } from '@/scripts/pages/canvas/constants'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import CanvasZoom from '@/views/pages/canvas/CanvasZoom.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует компонент с общим Pinia и документом-фикстурой. */
function setup(component: Component): VueWrapper {
  const pinia = createPinia()
  setActivePinia(pinia)
  useLayoutStore().loadDocument(makeDoc())
  mounted = mount(component, { global: { plugins: [pinia] }, attachTo: document.body })
  return mounted
}

/** Двойной клик по элементу в точке (0, 0): в happy-dom прямоугольники нулевые и точка попадает в подпись. */
function dblclick(el: Element): void {
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: 0 }))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  localStorage.clear()
})

describe('кнопка «Показывать подписи» в плашке зума', () => {
  it('первая в плашке, нажата по умолчанию, имя постоянное, подсказка «Скрыть подписи»', () => {
    const wrapper = setup(CanvasZoom)
    const first = wrapper.find('button')
    expect(first.attributes('aria-label')).toBe('Показывать подписи')
    expect(first.attributes('aria-pressed')).toBe('true')
    expect(first.attributes('title')).toBe('Скрыть подписи')
  })

  it('нажатие скрывает подписи: aria-pressed=false, подсказка «Показать подписи»', async () => {
    const wrapper = setup(CanvasZoom)
    await wrapper.find('button').trigger('click')
    const first = wrapper.find('button')
    expect(first.attributes('aria-pressed')).toBe('false')
    expect(first.attributes('aria-label')).toBe('Показывать подписи')
    expect(first.attributes('title')).toBe('Показать подписи')
  })

  it('кнопки зума без aria-pressed (переключатели — первые две: подписи и зеркало связей)', () => {
    const wrapper = setup(CanvasZoom)
    expect(
      wrapper
        .findAll('button')
        .slice(2)
        .every((b) => b.attributes('aria-pressed') === undefined),
    ).toBe(true)
  })
})

describe('подписи на канвасе', () => {
  it('переключатель вешает модификатор на поле; заголовок корня остаётся', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useLayoutStore().loadDocument(makeDoc())
    const viewport = mount(CanvasViewport, { global: { plugins: [pinia] }, attachTo: document.body })
    const zoom = mount(CanvasZoom, { global: { plugins: [pinia] } })
    expect(viewport.classes()).not.toContain(VIEWPORT_LABELS_HIDDEN_CLASS)
    await zoom.find('button').trigger('click')
    expect(viewport.classes()).toContain(VIEWPORT_LABELS_HIDDEN_CLASS)
    expect(viewport.find('[data-root-handle-id]').exists()).toBe(true)
    zoom.unmount()
    viewport.unmount()
  })

  it('двойной клик по подписи блока переименовывает, а при скрытых подписях — нет', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useLayoutStore().loadDocument(makeDoc())
    const viewport = mount(CanvasViewport, { global: { plugins: [pinia] }, attachTo: document.body })
    const zoom = mount(CanvasZoom, { global: { plugins: [pinia] } })
    const block = viewport.find('[data-node-id="a1"]').element
    dblclick(block)
    expect(useLabelEditStore().editingId).toBe('a1')
    useLabelEditStore().finish()
    await zoom.find('button').trigger('click')
    dblclick(block)
    expect(useLabelEditStore().editingId).toBeNull()
    zoom.unmount()
    viewport.unmount()
  })

  it('при скрытых подписях двойной клик по копии повтора тоже не открывает переименование', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const layoutStore = useLayoutStore()
    layoutStore.loadDocument(makeDoc())
    layoutStore.updateNode('a2', { repeat: 2 })
    const viewport = mount(CanvasViewport, { global: { plugins: [pinia] }, attachTo: document.body })
    const zoom = mount(CanvasZoom, { global: { plugins: [pinia] } })
    const copy = viewport.find('[data-repeat-of="a2"]').element
    dblclick(copy)
    expect(useLabelEditStore().editingId).toBe('a2')
    useLabelEditStore().finish()
    await zoom.find('button').trigger('click')
    dblclick(copy)
    expect(useLabelEditStore().editingId).toBeNull()
    zoom.unmount()
    viewport.unmount()
  })
})
