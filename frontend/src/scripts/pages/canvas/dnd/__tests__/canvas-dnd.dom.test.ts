/**
 * DOM-тесты перетаскивания на поле: порог, призрак и след, Esc, отпускание, совместная работа с кликом,
 * перемещение корня за заголовок.
 */
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

describe('перемещение корня за заголовок', () => {
  /** Корень A на поле (элемент `.canvas-root`). */
  function rootEl(wrapper: VueWrapper): HTMLElement {
    return wrapper.get('[data-root-handle-id="A"]').element.parentElement as HTMLElement
  }

  /** Нажатие на подписи корня A в (10, 10) и сдвиг указателя в (x, y); камера по умолчанию: экран = поле. */
  async function pressHeaderAndMove(wrapper: VueWrapper, x: number, y: number): Promise<void> {
    pointer(wrapper.get('[data-label-node-id="A"]').element, 'pointerdown', 10, 10)
    pointer(wrapper.element, 'pointermove', x, y)
    await wrapper.vm.$nextTick()
  }

  /** Точка корня A в документе. */
  function rootAt(): { x: number; y: number } | undefined {
    const canvas = useLayoutStore().document.roots.find((root) => root.node.id === 'A')?.canvas
    return canvas === undefined ? undefined : { x: canvas.x, y: canvas.y }
  }

  it('корень едет за указателем без записи в документ, без призрака и следа; выделяется', async () => {
    const wrapper = setup()
    const before = useLayoutStore().document
    await pressHeaderAndMove(wrapper, 60, 40)
    expect(useDragStore().movingRootId).toBe('A')
    expect(rootEl(wrapper).style.left).toBe('50px')
    expect(rootEl(wrapper).style.top).toBe('30px')
    expect(rootEl(wrapper).classList).toContain('canvas-root--moving')
    expect(useLayoutStore().document).toBe(before)
    expect(useLayoutStore().selectedId).toBe('A')
    expect(wrapper.find('.canvas-drag-ghost').exists()).toBe(false)
    expect(wrapper.find('.canvas-node--drag-source').exists()).toBe(false)
  })

  it('отпускание записывает новую точку одним шагом истории, undo возвращает', async () => {
    const wrapper = setup()
    await pressHeaderAndMove(wrapper, 60, 40)
    pointer(wrapper.element, 'pointerup', 60, 40)
    await wrapper.vm.$nextTick()
    expect(rootAt()).toEqual({ x: 50, y: 30 })
    expect(rootEl(wrapper).classList).not.toContain('canvas-root--moving')
    useLayoutStore().undo()
    expect(rootAt()).toEqual({ x: 0, y: 0 })
    expect(useLayoutStore().canUndo).toBe(false)
  })

  it('Esc возвращает корень на место, документ не меняется', async () => {
    const wrapper = setup()
    const before = useLayoutStore().document
    await pressHeaderAndMove(wrapper, 60, 40)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, cancelable: true }))
    await wrapper.vm.$nextTick()
    expect(rootEl(wrapper).style.left).toBe('0px')
    pointer(wrapper.element, 'pointerup', 60, 40)
    expect(useLayoutStore().document).toBe(before)
  })

  it('короткий клик по заголовку выделяет корень', async () => {
    const wrapper = setup()
    const title = wrapper.get('[data-label-node-id="C"]').element
    pointer(title, 'pointerdown', 10, 10)
    pointer(title, 'pointerup', 10, 10)
    await wrapper.vm.$nextTick()
    expect(useDragStore().isDragging).toBe(false)
    expect(useLayoutStore().selectedId).toBe('C')
  })

  it('тело корня тянет корень как узел (призрак), а не двигает по полю', async () => {
    const wrapper = setup()
    await pressAndMove(wrapper, 'C', 30, 0)
    expect(useDragStore().draggingId).toBe('C')
    expect(useDragStore().movingRootId).toBeNull()
  })
})

describe('перемещение корня: удаление во время жеста', () => {
  it('корень пропал из документа во время перемещения — перемещение отменяется', async () => {
    const wrapper = setup()
    pointer(wrapper.get('[data-label-node-id="C"]').element, 'pointerdown', 10, 10)
    pointer(wrapper.element, 'pointermove', 60, 60)
    expect(useDragStore().movingRootId).toBe('C')
    useLayoutStore().removeNode('C')
    await wrapper.vm.$nextTick()
    expect(useDragStore().isDragging).toBe(false)
  })
})
