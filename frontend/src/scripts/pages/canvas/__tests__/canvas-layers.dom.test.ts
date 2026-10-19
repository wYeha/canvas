/** DOM-тесты панели «Слои»: дерево корней, сворачивание, синхронизация выделения и ховера, центрирование корня. */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import { useLabelEditStore } from '@/scripts/pages/canvas/label-edit-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { isLayersDragging, resetLayersDragState } from '@/scripts/pages/canvas/layers-drag-state'
import { findNode } from '@/scripts/pages/canvas/tree-query'
import { childIds } from '@/scripts/pages/canvas/__tests__/tree-fixture'
import CanvasLayers from '@/views/pages/canvas/CanvasLayers.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper | null = null

/** Монтирует панель; `withDoc` — загрузить документ фикстуры. */
function setup(withDoc = true): VueWrapper {
  resetLayersDragState()
  const pinia = createPinia()
  setActivePinia(pinia)
  if (withDoc) useLayoutStore().loadDocument(makeDoc())
  mounted = mount(CanvasLayers, { global: { plugins: [pinia] }, attachTo: document.body })
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

/** Подменяет хит-тест: `document.elementFromPoint` в любой точке возвращает `el`. */
function hitAt(el: Element | null): void {
  /** Хит-тест-заглушка. */
  function elementFromPoint(): Element | null {
    return el
  }
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: elementFromPoint })
}

/** Отправляет pointer-событие ЛКМ в точке (x, y). */
function pointer(target: Element, type: string, x: number, y: number, pressed = type !== 'pointerup'): void {
  const buttons = pressed ? 1 : 0
  const init = { bubbles: true, cancelable: true, button: 0, buttons, pointerId: 1, isPrimary: true }
  target.dispatchEvent(new PointerEvent(type, { ...init, clientX: x, clientY: y }))
}

/** Задаёт прямоугольник элемента на странице. */
function stubRect(el: Element, x: number, y: number, width: number, height: number): void {
  /** Замер-заглушка. */
  function getBoundingClientRect(): DOMRect {
    return new DOMRect(x, y, width, height)
  }
  el.getBoundingClientRect = getBoundingClientRect
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
  resetLayersDragState()
  Reflect.deleteProperty(document, 'elementFromPoint')
})

describe('CanvasLayers', () => {
  it('без блоков — пустое состояние', () => {
    const wrapper = setup(false)
    expect(wrapper.text()).toContain('Нет блоков')
  })

  it('корни верхним уровнем, внутри деревья', () => {
    const wrapper = setup()
    expect(labels(wrapper)).toEqual(['A', 'a1', 'a1x', 'a1y', 'a2', 'a3', 'B', 'b1', 'C', 'c1'])
    expect(row(wrapper, 'a1').find('.canvas-layer-item__type').text()).toBe('grid')
    expect(row(wrapper, 'a3').find('.canvas-layer-item__type').text()).toBe('flex')
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

describe('CanvasLayers: переименование', () => {
  /** Подпись блока в документе. */
  function labelOf(id: string): string | undefined {
    const node = findNode(useLayoutStore().document, id)
    return node?.label
  }

  it('двойной клик открывает поле с текущей подписью в фокусе, Enter записывает', async () => {
    const wrapper = setup()
    await row(wrapper, 'a2').find('.canvas-layer-item__select').trigger('dblclick')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    const input = row(wrapper, 'a2').find('input')
    expect((input.element as HTMLInputElement).value).toBe('a2')
    expect(document.activeElement).toBe(input.element)
    await input.setValue('Подвал')
    await input.trigger('keydown', { code: 'Enter' })
    expect(labelOf('a2')).toBe('Подвал')
    expect(row(wrapper, 'a2').find('input').exists()).toBe(false)
  })

  it('Esc откатывает подпись', async () => {
    const wrapper = setup()
    await row(wrapper, 'a2').find('.canvas-layer-item__select').trigger('dblclick')
    const input = row(wrapper, 'a2').find('input')
    await input.setValue('Другое')
    await input.trigger('keydown', { code: 'Escape' })
    expect(labelOf('a2')).toBe('a2')
    expect(useLabelEditStore().editingId).toBeNull()
  })

  it('клик по строке запоминает выбор в «Слоях» для F2', async () => {
    const wrapper = setup()
    await row(wrapper, 'a1').find('.canvas-layer-item__select').trigger('click')
    expect(useLabelEditStore().renamePlaceFor('a1')).toBe('layers')
  })
})

describe('CanvasLayers: ввод в строке и сворачивание (ревью этапа 6)', () => {
  it('переименование в «Слоях» раскрывает свёрнутых предков и даёт поле в фокусе', async () => {
    const wrapper = setup()
    await row(wrapper, 'a1x').find('.canvas-layer-item__select').trigger('click')
    await row(wrapper, 'A').find('.canvas-layer-item__toggle').trigger('click')
    useLabelEditStore().beginRename('a1x', 'a1x', 'layers')
    await flushPromises()
    const input = row(wrapper, 'a1x').find('input')
    expect(input.exists()).toBe(true)
    expect(document.activeElement).toBe(input.element)
  })

  it('сворачивание ветки с открытым вводом применяет подпись', async () => {
    const wrapper = setup()
    await row(wrapper, 'a1x').find('.canvas-layer-item__select').trigger('dblclick')
    await row(wrapper, 'a1x').find('input').setValue('Новая')
    await row(wrapper, 'a1').find('.canvas-layer-item__toggle').trigger('click')
    expect(useLabelEditStore().editingId).toBeNull()
    expect(findNode(useLayoutStore().document, 'a1x')).toMatchObject({ label: 'Новая' })
  })

  it('клик по другой строке применяет открытый ввод', async () => {
    const wrapper = setup()
    await row(wrapper, 'a2').find('.canvas-layer-item__select').trigger('dblclick')
    await row(wrapper, 'a2').find('input').setValue('Подвал')
    await row(wrapper, 'b1').find('.canvas-layer-item__select').trigger('click')
    expect(useLabelEditStore().editingId).toBeNull()
    expect(findNode(useLayoutStore().document, 'a2')).toMatchObject({ label: 'Подвал' })
  })

  it('смена выделения не кликом по строке направляет F2 обратно на канвас', async () => {
    const wrapper = setup()
    await row(wrapper, 'a1').find('.canvas-layer-item__select').trigger('click')
    useLayoutStore().select('a1x')
    await wrapper.vm.$nextTick()
    useLayoutStore().select('a1')
    await wrapper.vm.$nextTick()
    expect(useLabelEditStore().renamePlaceFor('a1')).toBe('canvas')
  })
})

describe('CanvasLayers: перетаскивание (7.7)', () => {
  it('меняет порядок детей, Esc — нет', async () => {
    const wrapper = setup()
    const list = wrapper.get('.canvas-layers__list').element
    const a2Row = row(wrapper, 'a2').element
    const a1Row = row(wrapper, 'a1').element
    stubRect(a2Row, 40, 100, 200, 30)
    stubRect(a1Row, 40, 60, 200, 30)
    hitAt(a1Row)
    pointer(a2Row, 'pointerdown', 100, 115)
    pointer(list, 'pointermove', 108, 123)
    pointer(list, 'pointermove', 100, 64)
    await wrapper.vm.$nextTick()
    expect(isLayersDragging.value).toBe(true)
    pointer(list, 'pointerup', 100, 64)
    await wrapper.vm.$nextTick()
    expect(isLayersDragging.value).toBe(false)
    expect(childIds(useLayoutStore().document.roots[0]?.node)).toEqual(['a2', 'a1', 'a3'])
    const beforeEsc = childIds(useLayoutStore().document.roots[0]?.node)
    pointer(a2Row, 'pointerdown', 100, 115)
    pointer(list, 'pointermove', 108, 123)
    pointer(list, 'pointermove', 100, 64)
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(childIds(useLayoutStore().document.roots[0]?.node)).toEqual(beforeEsc)
  })

  it('меняет порядок корней', async () => {
    const wrapper = setup()
    const list = wrapper.get('.canvas-layers__list').element
    const cRow = row(wrapper, 'C').element
    const aRow = row(wrapper, 'A').element
    stubRect(cRow, 40, 280, 200, 30)
    stubRect(aRow, 40, 40, 200, 30)
    hitAt(aRow)
    pointer(cRow, 'pointerdown', 100, 295)
    pointer(list, 'pointermove', 108, 303)
    pointer(list, 'pointermove', 100, 44)
    pointer(list, 'pointerup', 100, 44)
    await wrapper.vm.$nextTick()
    expect(useLayoutStore().document.roots.map((r) => r.node.id)).toEqual(['C', 'A', 'B'])
  })

  it('нельзя отпустить на потомка — документ тот же', async () => {
    const wrapper = setup()
    const docBefore = useLayoutStore().document
    const list = wrapper.get('.canvas-layers__list').element
    const a1Row = row(wrapper, 'A').element
    const a1xRow = row(wrapper, 'a1x').element
    stubRect(a1Row, 40, 40, 200, 30)
    stubRect(a1xRow, 52, 160, 180, 30)
    hitAt(a1xRow)
    pointer(a1Row, 'pointerdown', 100, 55)
    pointer(list, 'pointermove', 108, 63)
    pointer(list, 'pointermove', 100, 168)
    pointer(list, 'pointerup', 100, 168)
    await wrapper.vm.$nextTick()
    expect(useLayoutStore().document).toBe(docBefore)
  })
})
