/** DOM-тесты ядра перетаскивания на поле: порог, призрак и след, Esc, отпускание, совместная работа с кликом. */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useDragStore } from '@/scripts/pages/canvas/dnd/drag-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import { makeDoc } from '@/scripts/pages/canvas/__tests__/tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует поле с документом фикстуры. */
function setup(): VueWrapper {
  const pinia = createPinia()
  setActivePinia(pinia)
  useLayoutStore().loadDocument(makeDoc())
  mounted = mount(CanvasViewport, { global: { plugins: [pinia] }, attachTo: document.body })
  return mounted
}

/** Элемент узла на поле по id. */
function nodeEl(wrapper: VueWrapper, id: string): Element {
  return wrapper.get(`[data-node-id="${id}"]`).element
}

/** Отправляет событие указателя основной кнопки в точке (x, y); `pressed` — зажата ли кнопка (маска `buttons`). */
function pointer(target: Element, type: string, x: number, y: number, pressed = type !== 'pointerup'): void {
  const buttons = pressed ? 1 : 0
  const init = { bubbles: true, cancelable: true, button: 0, buttons, pointerId: 1, isPrimary: true }
  target.dispatchEvent(new PointerEvent(type, { ...init, clientX: x, clientY: y }))
}

/** Нажатие на узле и сдвиг указателя на (dx, dy) от точки (10, 10). */
async function pressAndMove(wrapper: VueWrapper, id: string, dx: number, dy: number): Promise<void> {
  pointer(nodeEl(wrapper, id), 'pointerdown', 10, 10)
  pointer(wrapper.element, 'pointermove', 10 + dx, 10 + dy)
  await wrapper.vm.$nextTick()
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('перетаскивание на поле: старт', () => {
  it('сдвиг в пределах порога 4px перетаскивание не начинает', async () => {
    const wrapper = setup()
    await pressAndMove(wrapper, 'a2', 3, 0)
    expect(useDragStore().isDragging).toBe(false)
    expect(wrapper.find('.canvas-drag-ghost').exists()).toBe(false)
  })

  it('за порогом: призрак, пунктирный след, узел выделен, курсор поля', async () => {
    const wrapper = setup()
    await pressAndMove(wrapper, 'a2', 20, 5)
    expect(useDragStore().draggingId).toBe('a2')
    expect(useLayoutStore().selectedId).toBe('a2')
    expect(wrapper.get('.canvas-drag-ghost').text()).toContain('a2')
    expect(nodeEl(wrapper, 'a2').classList).toContain('canvas-node--drag-source')
    expect(wrapper.classes()).toContain('canvas-viewport--dragging')
    // Рамка выделения не закрывает пунктирный след
    expect(wrapper.find('.canvas-selection__box').exists()).toBe(false)
  })

  it('заголовок корня перетаскивание не начинает (это перемещение корня, 7.2)', async () => {
    const wrapper = setup()
    pointer(wrapper.get('[data-label-node-id="A"]').element, 'pointerdown', 10, 10)
    pointer(wrapper.element, 'pointermove', 40, 40)
    await wrapper.vm.$nextTick()
    expect(useDragStore().isDragging).toBe(false)
  })

  it('кнопку отпустили за пределами поля — движение без кнопки перетаскивание не начинает', async () => {
    const wrapper = setup()
    pointer(nodeEl(wrapper, 'a2'), 'pointerdown', 10, 10)
    pointer(wrapper.element, 'pointermove', 60, 60, false)
    await wrapper.vm.$nextTick()
    expect(useDragStore().isDragging).toBe(false)
  })

  it('плашку связи тоже можно тянуть', async () => {
    const wrapper = setup()
    await pressAndMove(wrapper, 'linkB', 10, 10)
    expect(useDragStore().draggingId).toBe('linkB')
    expect(wrapper.get('.canvas-drag-ghost').classes()).toContain('canvas-drag-ghost--link')
  })
})

describe('перетаскивание на поле: завершение', () => {
  it('Esc отменяет перетаскивание и не доходит до хоткеев', async () => {
    const wrapper = setup()
    await pressAndMove(wrapper, 'a1x', 20, 0)
    const esc = new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, cancelable: true })
    window.dispatchEvent(esc)
    await wrapper.vm.$nextTick()
    expect(esc.defaultPrevented).toBe(true)
    expect(useDragStore().isDragging).toBe(false)
    expect(useLayoutStore().selectedId).toBe('a1x')
    expect(wrapper.find('.canvas-drag-ghost').exists()).toBe(false)
    expect(nodeEl(wrapper, 'a1x').classList).not.toContain('canvas-node--drag-source')
  })

  it('отпускание завершает перетаскивание, документ не меняется', async () => {
    const wrapper = setup()
    const before = useLayoutStore().document
    await pressAndMove(wrapper, 'a2', 30, 30)
    pointer(wrapper.element, 'pointerup', 40, 40)
    await wrapper.vm.$nextTick()
    expect(useDragStore().isDragging).toBe(false)
    expect(useLayoutStore().document).toBe(before)
  })

  it('возврат к точке нажатия и отпускание — не клик: выделение не снимается', async () => {
    const wrapper = setup()
    await pressAndMove(wrapper, 'a2', 30, 0)
    pointer(wrapper.element, 'pointermove', 10, 10)
    pointer(wrapper.element, 'pointerup', 10, 10)
    await wrapper.vm.$nextTick()
    expect(useLayoutStore().selectedId).toBe('a2')
  })

  it('обычный клик без сдвига по-прежнему выделяет блок', async () => {
    const wrapper = setup()
    pointer(nodeEl(wrapper, 'b1'), 'pointerdown', 10, 10)
    pointer(nodeEl(wrapper, 'b1'), 'pointerup', 11, 10)
    await wrapper.vm.$nextTick()
    expect(useDragStore().isDragging).toBe(false)
    expect(useLayoutStore().selectedId).toBe('b1')
  })

  it('узел пропал из документа во время перетаскивания — перетаскивание отменяется', async () => {
    const wrapper = setup()
    await pressAndMove(wrapper, 'a2', 30, 0)
    useLayoutStore().removeNode('a2')
    await wrapper.vm.$nextTick()
    expect(useDragStore().isDragging).toBe(false)
  })
})
