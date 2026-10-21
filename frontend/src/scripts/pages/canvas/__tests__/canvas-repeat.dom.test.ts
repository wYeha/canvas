/**
 * DOM-тесты повтора ×N на поле: копии рисуются соседями исходного блока без `data-node-id`, приглушены, без чипа;
 * клик, ховер, двойной клик и перетаскивание по копии относятся к исходному блоку; копия не приёмник «внутрь».
 * Плюс знак `×N` в «Слоях» и поле «Повтор» в секции «Как ребёнок».
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Component } from 'vue'
import { useDragStore } from '@/scripts/pages/canvas/dnd/drag-store'
import { useLabelEditStore } from '@/scripts/pages/canvas/label-edit-store'
import { resetLayersDragState } from '@/scripts/pages/canvas/layers-drag-state'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { findNode } from '@/scripts/pages/canvas/tree-query'
import CanvasLayers from '@/views/pages/canvas/CanvasLayers.vue'
import CanvasPropsChild from '@/views/pages/canvas/CanvasPropsChild.vue'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper | null = null

/** Готовит стор: фикстура, у a1 (grid с a1x, a1y) повтор 2, у листа a2 — 3. */
function prepareStore(): ReturnType<typeof createPinia> {
  const pinia = createPinia()
  setActivePinia(pinia)
  const layoutStore = useLayoutStore()
  layoutStore.loadDocument(makeDoc())
  layoutStore.updateNode('a1', { repeat: 2 })
  layoutStore.updateNode('a2', { repeat: 3 })
  return pinia
}

/** Монтирует компонент с подготовленным стором. */
function setup(component: Component): VueWrapper {
  resetLayersDragState()
  const pinia = prepareStore()
  mounted = mount(component, { global: { plugins: [pinia] }, attachTo: document.body })
  return mounted
}

/** Подменяет хит-тест: `document.elementFromPoint` в любой точке возвращает `el`. */
function hitAt(el: Element | null): void {
  /** Хит-тест-заглушка: всегда `el`. */
  function elementFromPoint(): Element | null {
    return el
  }
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: elementFromPoint })
}

/** Отправляет событие указателя основной кнопки в точке (x, y). */
function pointer(target: Element, type: string, x: number, y: number, pressed = type !== 'pointerup'): void {
  const init = { bubbles: true, cancelable: true, button: 0, buttons: pressed ? 1 : 0, pointerId: 1, isPrimary: true }
  target.dispatchEvent(new PointerEvent(type, { ...init, clientX: x, clientY: y }))
}

/** Элементы копий повтора исходного блока `id` (включая содержимое копий). */
function copies(wrapper: VueWrapper, id: string): Element[] {
  return wrapper.findAll(`[data-repeat-of="${id}"]`).map((item) => item.element)
}

/** Первая копия-элемент верхнего уровня исходного блока `id`. */
function firstCopy(wrapper: VueWrapper, id: string): Element {
  const el = copies(wrapper, id).find((item) => item.classList.contains('canvas-node--repeat-copy'))
  if (el === undefined) throw new Error(`нет копии ${id}`)
  return el
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
  Reflect.deleteProperty(document, 'elementFromPoint')
})

describe('повтор на канвасе: отрисовка', () => {
  it('копии — соседи исходного блока, без data-node-id и подписей для правки, приглушены', () => {
    const wrapper = setup(CanvasViewport)
    expect(wrapper.findAll('[data-node-id="a2"]')).toHaveLength(1)
    const a2Copies = copies(wrapper, 'a2')
    expect(a2Copies).toHaveLength(2)
    const parent = wrapper.get('[data-node-id="A"]').element
    expect(a2Copies.every((el) => el.parentElement === parent)).toBe(true)
    expect(a2Copies.every((el) => el.classList.contains('canvas-node--repeat-copy'))).toBe(true)
    // Порядок: a1, копия a1, a2, две копии a2, a3
    const order = Array.from(parent.children)
      .filter((el) => el.classList.contains('canvas-node'))
      .map((el) => el.getAttribute('data-node-id') ?? `copy:${el.getAttribute('data-repeat-of') ?? ''}`)
    expect(order).toEqual(['a1', 'copy:a1', 'a2', 'copy:a2', 'copy:a2', 'a3'])
    expect(wrapper.findAll('[data-repeat-of] [data-label-node-id]')).toHaveLength(0)
  })

  it('копия контейнера — тень без содержимого и без чипа (16.5); ×N — у исходного блока', () => {
    const wrapper = setup(CanvasViewport)
    const copy = firstCopy(wrapper, 'a1')
    expect(copy.classList.contains('canvas-node--repeat-shadow')).toBe(true)
    expect(copy.querySelectorAll('.canvas-node')).toHaveLength(0)
    expect(copy.querySelector('.canvas-node__chip')).toBeNull()
    expect(wrapper.get('[data-node-id="a1"] > .canvas-node__label-box > .canvas-node__chip').text()).toContain('×2')
    expect(wrapper.get('[data-node-id="a2"] > .canvas-node__caption').text()).toContain('×3')
    expect(wrapper.get('[data-node-id="a3"] > .canvas-node__caption').text()).not.toContain('×')
  })

  it('у корня с repeat > 1 (из импорта) на чипе нет ×N, у вложенного блока есть', async () => {
    const wrapper = setup(CanvasViewport)
    useLayoutStore().updateNode('A', { repeat: 3 })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-node-id="A"] > .canvas-node__label-box > .canvas-node__chip').text()).not.toContain('×')
    expect(wrapper.get('[data-node-id="a1"] > .canvas-node__label-box > .canvas-node__chip').text()).toContain('×2')
  })
})

describe('повтор на канвасе: выделение и ховер', () => {
  it('клик по тени копии выделяет исходный блок с повтором', async () => {
    const wrapper = setup(CanvasViewport)
    const shadow = firstCopy(wrapper, 'a1')
    pointer(shadow, 'pointerdown', 10, 10)
    pointer(shadow, 'pointerup', 10, 10)
    await wrapper.vm.$nextTick()
    expect(useLayoutStore().selectedId).toBe('a1')
  })

  it('наведение на копию подсвечивает исходный блок', () => {
    const wrapper = setup(CanvasViewport)
    pointer(firstCopy(wrapper, 'a2'), 'pointermove', 10, 10, false)
    expect(useLayoutStore().hoveredId).toBe('a2')
  })

  it('двойной клик по копии открывает переименование исходного блока', () => {
    const wrapper = setup(CanvasViewport)
    firstCopy(wrapper, 'a2').dispatchEvent(new MouseEvent('dblclick', { bubbles: true, button: 0 }))
    expect(useLayoutStore().selectedId).toBe('a2')
    expect(useLabelEditStore().editingId).toBe('a2')
  })
})

describe('повтор на канвасе: перетаскивание', () => {
  it('за копию тянется исходный блок', async () => {
    const wrapper = setup(CanvasViewport)
    pointer(firstCopy(wrapper, 'a2'), 'pointerdown', 10, 10)
    pointer(wrapper.element, 'pointermove', 40, 10)
    await wrapper.vm.$nextTick()
    expect(useDragStore().draggingId).toBe('a2')
    expect(firstCopy(wrapper, 'a2').classList).not.toContain('canvas-node--drag-source')
  })

  it('над копией приёмник — родитель исходного блока, а не копия', async () => {
    const wrapper = setup(CanvasViewport)
    hitAt(firstCopy(wrapper, 'a1'))
    pointer(wrapper.get('[data-node-id="c1"]').element, 'pointerdown', 10, 10)
    pointer(wrapper.element, 'pointermove', 40, 10)
    await wrapper.vm.$nextTick()
    const target = useDragStore().dropTarget
    expect(target?.kind === 'block' ? target.id : null).toBe('A')
  })
})

describe('повтор в «Слоях» и в свойствах', () => {
  it('строка слоя показывает ×N после подписи, копий в дереве нет', () => {
    const wrapper = setup(CanvasLayers)
    expect(wrapper.get('[data-layer-id="a2"] .canvas-layer-item__repeat').text()).toBe('×3')
    expect(wrapper.find('[data-layer-id="a3"] .canvas-layer-item__repeat').exists()).toBe(false)
    expect(wrapper.findAll('[data-layer-id="a2"]')).toHaveLength(1)
  })

  it('поле «Повтор» пишет repeat выделенного блока в пределах 1…24', async () => {
    const pinia = prepareStore()
    useLayoutStore().select('a3')
    mounted = mount(CanvasPropsChild, { global: { plugins: [pinia] }, attachTo: document.body })
    const input = mounted.get('input[aria-valuemax="24"]')
    await input.setValue('5')
    await input.trigger('blur')
    expect(findNode(useLayoutStore().document, 'a3')?.repeat).toBe(5)
    await input.setValue('40')
    await input.trigger('blur')
    expect(findNode(useLayoutStore().document, 'a3')?.repeat).toBe(24)
  })
})
