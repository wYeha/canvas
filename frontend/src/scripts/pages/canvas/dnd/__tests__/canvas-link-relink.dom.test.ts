/**
 * DOM-тесты перепривязки связи за конец стрелки (связь переезжает в блок под курсором одним шагом истории,
 * её стрелка на время жеста скрыта, отказ и Esc ничего не меняют) и «Вынести на канвас» из панели свойств.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Component } from 'vue'
import { LINK_END_ATTR } from '@/scripts/pages/canvas/constants'
import { useDragStore } from '@/scripts/pages/canvas/dnd/drag-store'
import { createLinkBlock } from '@/scripts/pages/canvas/factories'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { addChild } from '@/scripts/pages/canvas/tree'
import { findNode, findParent, findRootEntry } from '@/scripts/pages/canvas/tree-query'
import CanvasProps from '@/views/pages/canvas/CanvasProps.vue'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import { childIds, makeDoc } from '@/scripts/pages/canvas/__tests__/tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует компонент: фикстура и связь lC на корень C внутри a2. */
function setup(component: Component = CanvasViewport): VueWrapper {
  const pinia = createPinia()
  setActivePinia(pinia)
  useLayoutStore().loadDocument(addChild(makeDoc(), 'a2', { ...createLinkBlock('C'), id: 'lC' }))
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
function pointer(target: Element, type: string, x: number, y: number): void {
  const buttons = type === 'pointerup' ? 0 : 1
  const init = { bubbles: true, cancelable: true, button: 0, buttons, pointerId: 1, isPrimary: true }
  target.dispatchEvent(new PointerEvent(type, { ...init, clientX: x, clientY: y }))
}

/** Элемент узла на поле по id. */
function nodeEl(wrapper: VueWrapper, id: string): Element {
  return wrapper.get(`[data-node-id="${id}"]`).element
}

/**
 * Ручка конца стрелки связи `linkId` в слое мира. В jsdom замеры нулевые и стрелки не рисуются, поэтому ручка
 * ставится вручную с тем же атрибутом, что у `CanvasLinks`.
 */
function endHandle(wrapper: VueWrapper, linkId: string): Element {
  const el = document.createElement('span')
  el.setAttribute(LINK_END_ATTR, linkId)
  wrapper.get('.canvas-viewport__world').element.appendChild(el)
  return el
}

/** Берётся за конец стрелки `linkId` и уводит указатель за порог. */
async function dragEnd(wrapper: VueWrapper, linkId: string): Promise<void> {
  pointer(endHandle(wrapper, linkId), 'pointerdown', 10, 10)
  pointer(wrapper.element, 'pointermove', 40, 30)
  await wrapper.vm.$nextTick()
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
  Reflect.deleteProperty(document, 'elementFromPoint')
})

describe('перепривязка за конец стрелки', () => {
  it('связь выделена и тянется к своему источнику; отпускание над блоком переносит её одним шагом', async () => {
    const wrapper = setup()
    hitAt(nodeEl(wrapper, 'b1'))
    await dragEnd(wrapper, 'lC')
    const drag = useDragStore()
    expect(drag.linkSourceId).toBe('C')
    expect(drag.relinkingId).toBe('lC')
    expect(useLayoutStore().selectedId).toBe('lC')
    expect(nodeEl(wrapper, 'b1').classList.contains('canvas-node--drop-target')).toBe(true)
    pointer(wrapper.element, 'pointerup', 40, 30)
    const store = useLayoutStore()
    expect(findParent(store.document, 'lC')?.id).toBe('b1')
    expect(childIds(findNode(store.document, 'a2'))).toEqual([])
    expect(findNode(store.document, 'lC')?.sourceId).toBe('C')
    store.undo()
    expect(findParent(store.document, 'lC')?.id).toBe('a2')
  })

  it('внутри источника — отказ, документ не меняется', async () => {
    const wrapper = setup()
    hitAt(nodeEl(wrapper, 'c1'))
    await dragEnd(wrapper, 'lC')
    expect(nodeEl(wrapper, 'c1').classList.contains('canvas-node--link-denied')).toBe(true)
    const before = useLayoutStore().document
    pointer(wrapper.element, 'pointerup', 40, 30)
    expect(useLayoutStore().document).toBe(before)
  })

  it('Esc отменяет; клик по ручке без сдвига выделяет связь', async () => {
    const wrapper = setup()
    hitAt(nodeEl(wrapper, 'b1'))
    await dragEnd(wrapper, 'lC')
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }))
    expect(useDragStore().isDragging).toBe(false)
    expect(findParent(useLayoutStore().document, 'lC')?.id).toBe('a2')
    useLayoutStore().select(null)
    const handle = endHandle(wrapper, 'lC')
    pointer(handle, 'pointerdown', 5, 5)
    pointer(handle, 'pointerup', 5, 5)
    expect(useLayoutStore().selectedId).toBe('lC')
  })
})

describe('«Вынести на канвас»', () => {
  it('блок становится корнем правее своего корня, на его месте — выделенная связь', async () => {
    const wrapper = setup(CanvasProps)
    const store = useLayoutStore()
    store.select('a1')
    await wrapper.vm.$nextTick()
    const button = wrapper.findAll('button').find((b) => b.text() === 'Вынести на канвас')
    await button?.trigger('click')
    const [linkId] = childIds(findNode(store.document, 'A'))
    expect(findNode(store.document, linkId ?? '')?.sourceId).toBe('a1')
    expect(store.selectedId).toBe(linkId)
    expect(findRootEntry(store.document, 'a1')?.canvas.x).toBeGreaterThan(1440)
    store.undo()
    expect(childIds(findNode(store.document, 'A'))[0]).toBe('a1')
  })
})
