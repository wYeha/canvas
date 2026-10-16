/**
 * DOM-тесты перетаскивания на поле: порог, призрак и след, Esc, отпускание, совместная работа с кликом,
 * перемещение корня за заголовок, поиск приёмника и перенос на пустое поле.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import { useDragStore } from '@/scripts/pages/canvas/dnd/drag-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { findNode, findRootEntry } from '@/scripts/pages/canvas/tree-query'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import { childIds, makeDoc } from '@/scripts/pages/canvas/__tests__/tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует поле с документом фикстуры; `panel` — разметка плавающей панели в слоте (вне слоя мира). */
function setup(panel?: string): VueWrapper {
  const pinia = createPinia()
  setActivePinia(pinia)
  useLayoutStore().loadDocument(makeDoc())
  const slots = panel === undefined ? {} : { default: panel }
  mounted = mount(CanvasViewport, { global: { plugins: [pinia] }, slots, attachTo: document.body })
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

/** Элемент узла на поле по id. */
function nodeEl(wrapper: VueWrapper, id: string): Element {
  return wrapper.get(`[data-node-id="${id}"]`).element
}

/** Подменяет замер элемента: прямоугольник на странице с левым верхним углом (x, y) заданного размера. */
function stubRect(el: Element, x: number, y: number, width: number, height: number): void {
  /** Замер-заглушка. */
  function getBoundingClientRect(): DOMRect {
    return new DOMRect(x, y, width, height)
  }
  el.getBoundingClientRect = getBoundingClientRect
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
  Reflect.deleteProperty(document, 'elementFromPoint')
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

describe('поиск приёмника', () => {
  it('над блоком другого корня — этот блок; над пустым полем — поле', async () => {
    const wrapper = setup()
    hitAt(nodeEl(wrapper, 'c1'))
    await pressAndMove(wrapper, 'a2', 20, 0)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'c1', index: 0 })
    hitAt(wrapper.element)
    pointer(wrapper.element, 'pointermove', 50, 50)
    expect(useDragStore().dropTarget).toEqual({ kind: 'canvas' })
    expect(wrapper.classes()).not.toContain('canvas-viewport--drop-denied')
  })

  it('над панелью и вне окна — приёмника нет, курсор «нельзя»', async () => {
    const wrapper = setup('<aside class="test-panel">Панель</aside>')
    hitAt(wrapper.get('.test-panel').element)
    await pressAndMove(wrapper, 'a2', 20, 0)
    expect(useDragStore().dropTarget).toBeNull()
    expect(wrapper.classes()).toContain('canvas-viewport--drop-denied')
    hitAt(null)
    pointer(wrapper.element, 'pointermove', 50, 50)
    await wrapper.vm.$nextTick()
    expect(useDragStore().dropDenied).toBe(true)
  })

  it('над заголовком другого корня — приёмник этот корень', async () => {
    const wrapper = setup()
    hitAt(wrapper.get('[data-label-node-id="C"]').element)
    await pressAndMove(wrapper, 'a2', 20, 0)
    // В happy-dom замер c1 нулевой: точка (30, 10) правее его середины — после него
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'C', index: 1 })
  })

  it('смена камеры без движения мыши пересчитывает приёмник', async () => {
    const wrapper = setup()
    hitAt(wrapper.element)
    await pressAndMove(wrapper, 'a2', 20, 0)
    expect(useDragStore().dropTarget).toEqual({ kind: 'canvas' })
    hitAt(nodeEl(wrapper, 'b1'))
    useCameraStore().panBy(10, 0)
    await wrapper.vm.$nextTick()
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'b1', index: 0 })
  })

  it('Esc сбрасывает приёмник, документ не меняется', async () => {
    const wrapper = setup()
    const before = useLayoutStore().document
    hitAt(wrapper.element)
    await pressAndMove(wrapper, 'a2', 20, 0)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, cancelable: true }))
    pointer(wrapper.element, 'pointerup', 40, 40)
    expect(useDragStore().dropTarget).toBeNull()
    expect(useLayoutStore().document).toBe(before)
  })
})

describe('отпускание над пустым полем', () => {
  it('вложенный блок становится корнем: точка по захвату, ширина как на экране, один шаг истории', async () => {
    const wrapper = setup()
    stubRect(nodeEl(wrapper, 'a2'), 0, 0, 200, 50)
    hitAt(wrapper.element)
    await pressAndMove(wrapper, 'a2', 20, 0)
    pointer(wrapper.element, 'pointerup', 110, 60)
    await wrapper.vm.$nextTick()
    const store = useLayoutStore()
    expect(findRootEntry(store.document, 'a2')?.canvas).toMatchObject({ x: 100, y: 50, width: 200 })
    expect(store.document.roots.at(-1)?.node.id).toBe('a2')
    expect(store.selectedId).toBe('a2')
    store.undo()
    expect(childIds(findNode(store.document, 'A'))).toEqual(['a1', 'a2', 'linkB'])
    expect(store.canUndo).toBe(false)
  })

  it('без замера ширины новый корень берёт ширину корня-источника', async () => {
    const wrapper = setup()
    hitAt(wrapper.element)
    await pressAndMove(wrapper, 'a1x', 20, 0)
    pointer(wrapper.element, 'pointerup', 40, 40)
    expect(findRootEntry(useLayoutStore().document, 'a1x')?.canvas.width).toBe(1440)
  })

  it('корень за тело переезжает одним шагом, порядок корней тот же', async () => {
    const wrapper = setup()
    hitAt(nodeEl(wrapper, 'c1'))
    await pressAndMove(wrapper, 'C', 30, 0)
    expect(useDragStore().dropTarget).toEqual({ kind: 'canvas' })
    pointer(wrapper.element, 'pointerup', 40, 10)
    const store = useLayoutStore()
    expect(findRootEntry(store.document, 'C')?.canvas).toMatchObject({ x: 40, y: 10, width: 960 })
    expect(store.document.roots.map((root) => root.node.id)).toEqual(['A', 'B', 'C'])
    store.undo()
    expect(findRootEntry(store.document, 'C')?.canvas).toMatchObject({ x: 3000, y: 0 })
  })

  it('плашка связи над полем — «нельзя», отпускание ничего не меняет', async () => {
    const wrapper = setup()
    const before = useLayoutStore().document
    hitAt(wrapper.element)
    await pressAndMove(wrapper, 'linkB', 20, 0)
    expect(wrapper.classes()).toContain('canvas-viewport--drop-denied')
    pointer(wrapper.element, 'pointerup', 40, 40)
    expect(useLayoutStore().document).toBe(before)
  })

  it('отпускание над блоком с индексом переносит узел внутрь', async () => {
    const wrapper = setup()
    hitAt(nodeEl(wrapper, 'c1'))
    await pressAndMove(wrapper, 'a2', 20, 0)
    pointer(wrapper.element, 'pointerup', 40, 40)
    const store = useLayoutStore()
    expect(childIds(findNode(store.document, 'c1'))).toEqual(['a2'])
    store.undo()
    expect(childIds(findNode(store.document, 'A'))).toContain('a2')
  })
})

describe('индекс вставки во flex', () => {
  /** Ставит детей корня A (flex row) в линию: a1, a2, linkB по x 0/100/200, каждый 100×40. */
  function layoutA(wrapper: VueWrapper): void {
    stubRect(nodeEl(wrapper, 'a1'), 0, 0, 100, 40)
    stubRect(nodeEl(wrapper, 'a2'), 100, 0, 100, 40)
    stubRect(nodeEl(wrapper, 'linkB'), 200, 0, 100, 40)
  }

  it('узел из другого корня над областью A — индекс по серединам детей, смена индекса заменяет цель', async () => {
    const wrapper = setup()
    layoutA(wrapper)
    hitAt(nodeEl(wrapper, 'A'))
    await pressAndMove(wrapper, 'c1', 110, 0)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'A', index: 1 })
    const first = useDragStore().dropTarget
    pointer(wrapper.element, 'pointermove', 130, 10)
    expect(useDragStore().dropTarget).toBe(first)
    pointer(wrapper.element, 'pointermove', 260, 10)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'A', index: 3 })
  })

  it('над собственным следом — «на место»; отпускание документ не меняет', async () => {
    const wrapper = setup()
    const before = useLayoutStore().document
    layoutA(wrapper)
    hitAt(nodeEl(wrapper, 'a2'))
    await pressAndMove(wrapper, 'a2', 140, 0)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'A', index: 2 })
    pointer(wrapper.element, 'pointerup', 150, 10)
    expect(useLayoutStore().document).toBe(before)
  })

  it('над пустым flex-блоком — 0', async () => {
    const wrapper = setup()
    hitAt(nodeEl(wrapper, 'b1'))
    await pressAndMove(wrapper, 'a2', 20, 0)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'b1', index: 0 })
  })

  it('отпускание над flex-блоком с индексом переносит узел, один шаг истории', async () => {
    const wrapper = setup()
    layoutA(wrapper)
    hitAt(nodeEl(wrapper, 'A'))
    await pressAndMove(wrapper, 'c1', 110, 0)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'A', index: 1 })
    pointer(wrapper.element, 'pointerup', 120, 10)
    expect(useDragStore().isDragging).toBe(false)
    const store = useLayoutStore()
    expect(childIds(findNode(store.document, 'A'))).toEqual(['a1', 'c1', 'a2', 'linkB'])
    store.undo()
    expect(childIds(findNode(store.document, 'C'))).toEqual(['c1'])
  })

  it('над приёмником — класс drop-target и линия вставки', async () => {
    const wrapper = setup()
    layoutA(wrapper)
    hitAt(nodeEl(wrapper, 'A'))
    await pressAndMove(wrapper, 'c1', 110, 0)
    expect(nodeEl(wrapper, 'A').classList).toContain('canvas-node--drop-target')
    expect(wrapper.find('.canvas-drop-insert').exists()).toBe(true)
  })
})

describe('индекс вставки в grid', () => {
  /** Дети grid a1 в одну строку: a1x и a1y по x 0 и 110, каждый 100×40. */
  function layoutA1(wrapper: VueWrapper): void {
    stubRect(nodeEl(wrapper, 'a1x'), 0, 0, 100, 40)
    stubRect(nodeEl(wrapper, 'a1y'), 110, 0, 100, 40)
  }

  it('узел из другого корня над a1 — индекс по ближайшему ребёнку и X', async () => {
    const wrapper = setup()
    layoutA1(wrapper)
    hitAt(nodeEl(wrapper, 'a1'))
    await pressAndMove(wrapper, 'c1', 20, 0)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'a1', index: 0 })
    pointer(wrapper.element, 'pointermove', 150, 10)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'a1', index: 1 })
    pointer(wrapper.element, 'pointermove', 200, 10)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'a1', index: 2 })
  })

  it('над собственным следом — «на место»; отпускание документ не меняет', async () => {
    const wrapper = setup()
    const before = useLayoutStore().document
    layoutA1(wrapper)
    hitAt(nodeEl(wrapper, 'a1'))
    await pressAndMove(wrapper, 'a1x', 70, 0)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'a1', index: 1 })
    pointer(wrapper.element, 'pointermove', 160, 10)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'a1', index: 2 })
    pointer(wrapper.element, 'pointermove', 130, 10)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'a1', index: 1 })
    pointer(wrapper.element, 'pointerup', 135, 10)
    expect(useLayoutStore().document).toBe(before)
  })

  it('отпускание над grid с индексом переносит узел внутрь', async () => {
    const wrapper = setup()
    layoutA1(wrapper)
    hitAt(nodeEl(wrapper, 'a1'))
    await pressAndMove(wrapper, 'c1', 20, 0)
    expect(useDragStore().dropTarget).toEqual({ kind: 'block', id: 'a1', index: 0 })
    pointer(wrapper.element, 'pointerup', 30, 10)
    expect(useDragStore().isDragging).toBe(false)
    const store = useLayoutStore()
    expect(childIds(findNode(store.document, 'a1'))).toEqual(['c1', 'a1x', 'a1y'])
    store.undo()
    expect(childIds(findNode(store.document, 'C'))).toEqual(['c1'])
  })
})
