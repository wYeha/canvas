/**
 * DOM-тесты плашек связей: плашка на месте ребёнка с именем источника, двойной клик ведёт к источнику,
 * переименование связи не открывается, строка в «Слоях», секция «Связь» в свойствах с переходом к источнику,
 * ширины «источник / место» и «Подогнать».
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import type { Component } from 'vue'
import { createLinkBlock } from '@/scripts/pages/canvas/factories'
import { useLabelEditStore } from '@/scripts/pages/canvas/label-edit-store'
import { resetLayersDragState } from '@/scripts/pages/canvas/layers-drag-state'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { addChild } from '@/scripts/pages/canvas/tree'
import { findRootEntry } from '@/scripts/pages/canvas/tree-query'
import CanvasLayers from '@/views/pages/canvas/CanvasLayers.vue'
import CanvasProps from '@/views/pages/canvas/CanvasProps.vue'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует компонент со стором: фикстура и связь lC на корень C внутри a2. */
function setup(component: Component): VueWrapper {
  resetLayersDragState()
  const pinia = createPinia()
  setActivePinia(pinia)
  useLayoutStore().loadDocument(addChild(makeDoc(), 'a2', { ...createLinkBlock('C'), id: 'lC' }))
  mounted = mount(component, { global: { plugins: [pinia] }, attachTo: document.body })
  return mounted
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
  vi.restoreAllMocks()
})

describe('плашка на канвасе', () => {
  it('рисуется на месте ребёнка с именем источника и следит за его подписью', async () => {
    const wrapper = setup(CanvasViewport)
    const plaque = wrapper.get('[data-node-id="lC"]')
    expect(plaque.classes()).toContain('canvas-node--link')
    expect(plaque.element.parentElement?.getAttribute('data-node-id')).toBe('a2')
    expect(plaque.text()).toContain('⇢')
    expect(plaque.text()).toContain('C')
    useLayoutStore().updateNode('C', { label: 'Карточка' })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-node-id="lC"]').text()).toContain('Карточка')
  })

  it('двойной клик по плашке выделяет источник, переименование не открывается', () => {
    const wrapper = setup(CanvasViewport)
    const caption = wrapper.get('[data-label-node-id="lC"]').element
    caption.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: 0 }))
    expect(useLayoutStore().selectedId).toBe('C')
    expect(useLabelEditStore().editingId).toBeNull()
  })

  it('переименование связи (F2, «Слои») не открывается', () => {
    setup(CanvasViewport)
    useLabelEditStore().beginRename('lC', '', 'canvas')
    expect(useLabelEditStore().editingId).toBeNull()
  })
})

describe('связь в «Слоях» и свойствах', () => {
  it('строка связи: имя источника и тип «связь»', () => {
    const wrapper = setup(CanvasLayers)
    const row = wrapper.get('[data-layer-id="lC"]')
    expect(row.text()).toContain('C')
    expect(row.text()).toContain('связь')
  })

  it('секция «Связь»: имя источника и переход к нему', async () => {
    const wrapper = setup(CanvasProps)
    useLayoutStore().select('lC')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Связь')
    expect(wrapper.text()).toContain('Как ребёнок')
    expect(wrapper.text()).not.toContain('Контейнер')
    const go = wrapper.findAll('button').find((button) => button.text().includes('Перейти к источнику'))
    await go?.trigger('click')
    expect(useLayoutStore().selectedId).toBe('C')
  })
})

describe('ширина связи', () => {
  /** Находит кнопку по тексту. */
  function button(wrapper: VueWrapper, text: string) {
    const found = wrapper.findAll('button').find((b) => b.text() === text)
    if (!found) throw new Error(`нет кнопки «${text}»`)
    return found
  }

  it('место не отрисовано — прочерк, «Подогнать» недоступно', async () => {
    const wrapper = setup(CanvasProps)
    useLayoutStore().select('lC')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('источник: 960px / место: —')
    expect(button(wrapper, 'Подогнать').attributes('disabled')).toBeDefined()
  })

  it('«Подогнать» ставит ширину превью источника равной месту одним шагом', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 300.4, 40))
    // Поле не смонтировано: слой мира и плашка — заглушки с тем же селектором и атрибутом
    const world = document.createElement('div')
    world.setAttribute('data-canvas-world', '')
    const plaque = document.createElement('div')
    plaque.setAttribute('data-node-id', 'lC')
    world.appendChild(plaque)
    document.body.appendChild(world)
    const wrapper = setup(CanvasProps)
    const store = useLayoutStore()
    store.select('lC')
    // Секция монтируется после выделения, замер — на следующем тике после монтирования
    await flushPromises()
    expect(wrapper.text()).toContain('источник: 960px / место: 300px')
    await button(wrapper, 'Подогнать').trigger('click')
    expect(findRootEntry(store.document, 'C')?.canvas.width).toBe(300)
    store.undo()
    expect(findRootEntry(store.document, 'C')?.canvas.width).toBe(960)
    world.remove()
  })
})
