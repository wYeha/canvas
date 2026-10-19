/**
 * DOM-тесты создания связи протягиванием от порта корня: старт после порога, линия и курсор, подсветка цели
 * и отказа, отпускание ставит связь одним шагом истории, плашка прозрачна, Esc отменяет.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useDragStore } from '@/scripts/pages/canvas/dnd/drag-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { findNode, findRootEntry } from '@/scripts/pages/canvas/tree-query'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import { childIds, makeDoc } from '@/scripts/pages/canvas/__tests__/tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует поле с документом фикстуры (корни A, B, C). */
function setup(): VueWrapper {
  const pinia = createPinia()
  setActivePinia(pinia)
  useLayoutStore().loadDocument(makeDoc())
  mounted = mount(CanvasViewport, { global: { plugins: [pinia] }, attachTo: document.body })
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

/** Нажимает на порт корня `rootId` и уводит указатель за порог. */
async function dragFromPort(wrapper: VueWrapper, rootId: string): Promise<void> {
  pointer(wrapper.get(`[data-link-port-id="${rootId}"]`).element, 'pointerdown', 10, 10)
  pointer(wrapper.element, 'pointermove', 40, 30)
  await wrapper.vm.$nextTick()
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
  Reflect.deleteProperty(document, 'elementFromPoint')
})

describe('создание связи от порта', () => {
  it('у каждого корня есть порт; протягивание — линия и курсор-прицел, корень не двигается', async () => {
    const wrapper = setup()
    expect(wrapper.findAll('[data-link-port-id]')).toHaveLength(3)
    hitAt(null)
    await dragFromPort(wrapper, 'C')
    expect(useDragStore().linkSourceId).toBe('C')
    expect(useDragStore().movingRootId).toBeNull()
    expect(wrapper.find('.canvas-link-draft').exists()).toBe(true)
    expect(wrapper.classes()).toContain('canvas-viewport--linking')
  })

  it('над допустимым блоком — подсветка приёмника; отпускание ставит связь одним шагом истории', async () => {
    const wrapper = setup()
    hitAt(nodeEl(wrapper, 'a2'))
    await dragFromPort(wrapper, 'C')
    expect(nodeEl(wrapper, 'a2').classList.contains('canvas-node--drop-target')).toBe(true)
    pointer(wrapper.element, 'pointerup', 40, 30)
    const store = useLayoutStore()
    const [linkId] = childIds(findNode(store.document, 'a2'))
    expect(findNode(store.document, linkId ?? '')?.sourceId).toBe('C')
    expect(store.selectedId).toBe(linkId)
    expect(findRootEntry(store.document, 'C')?.canvas.x).toBe(3000)
    store.undo()
    expect(childIds(findNode(store.document, 'a2'))).toEqual([])
  })

  it('внутри своего корня — красная подсветка, курсор «нельзя», отпускание ничего не меняет', async () => {
    const wrapper = setup()
    hitAt(nodeEl(wrapper, 'c1'))
    await dragFromPort(wrapper, 'C')
    expect(nodeEl(wrapper, 'c1').classList.contains('canvas-node--link-denied')).toBe(true)
    expect(wrapper.classes()).toContain('canvas-viewport--drop-denied')
    const before = useLayoutStore().document
    pointer(wrapper.element, 'pointerup', 40, 30)
    expect(useLayoutStore().document).toBe(before)
    await wrapper.vm.$nextTick()
    expect(nodeEl(wrapper, 'c1').classList.contains('canvas-node--link-denied')).toBe(false)
  })

  it('пустое поле — ни цели, ни отказа', async () => {
    const wrapper = setup()
    hitAt(wrapper.element)
    await dragFromPort(wrapper, 'C')
    expect(useDragStore().dropTarget).toBeNull()
    expect(useDragStore().linkDeniedId).toBeNull()
  })

  it('Esc отменяет протягивание', async () => {
    const wrapper = setup()
    hitAt(nodeEl(wrapper, 'a2'))
    await dragFromPort(wrapper, 'C')
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(useDragStore().isDragging).toBe(false)
    expect(wrapper.find('.canvas-link-draft').exists()).toBe(false)
  })
})
