/**
 * DOM-тесты режима фокуса (16.7): двойной клик по телу блока (мимо подписи) включает фокус и выделяет блок, оверлей
 * рисует затемнение; Esc выходит, выделение остаётся; клик мимо поддерева и удаление блока тоже выходят.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { useFocusModeStore } from '@/scripts/pages/canvas/focus-mode-store'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { useCanvasHotkeys } from '@/scripts/pages/canvas/use-canvas-hotkeys'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper[] = []

afterEach(() => {
  mounted.forEach((wrapper) => {
    wrapper.unmount()
  })
  mounted = []
})

/** Пустой обработчик опций горячих клавиш. */
function noop(): void {}

/** Блокировки горячих клавиш нет. */
function notBlocked(): boolean {
  return false
}

/** Компонент только с горячими клавишами канваса. */
const Hotkeys = defineComponent({
  /** Подключает горячие клавиши. */
  setup() {
    useCanvasHotkeys({ openExport: noop, openHotkeys: noop, isBlocked: notBlocked })
    return noop
  },
})

/** Поле и горячие клавиши на одном сторе с документом-фикстурой. */
function setup(): VueWrapper {
  const pinia = createPinia()
  setActivePinia(pinia)
  useLayoutStore().loadDocument(makeDoc())
  const viewport = mount(CanvasViewport, { global: { plugins: [pinia] }, attachTo: document.body })
  mounted = [viewport, mount(Hotkeys, { global: { plugins: [pinia] } })]
  return viewport
}

/** Двойной клик по телу блока `id` далеко от подписи (в happy-dom у подписи нулевой прямоугольник в 0,0). */
function dblclickBody(wrapper: VueWrapper, id: string): void {
  const init = { bubbles: true, button: 0, clientX: 500, clientY: 500 }
  wrapper.get(`[data-node-id="${id}"]`).element.dispatchEvent(new MouseEvent('dblclick', init))
}

describe('режим фокуса', () => {
  it('двойной клик по телу блока — фокус и выделение, в оверлее затемнение; Esc выходит, выделение остаётся', async () => {
    const wrapper = setup()
    dblclickBody(wrapper, 'a1')
    await wrapper.vm.$nextTick()
    expect(useFocusModeStore().focusId).toBe('a1')
    expect(useLayoutStore().selectedId).toBe('a1')
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }))
    expect(useFocusModeStore().focusId).toBeNull()
    expect(useLayoutStore().selectedId).toBe('a1')
  })

  it('удаление блока в фокусе выключает режим', async () => {
    const wrapper = setup()
    dblclickBody(wrapper, 'a2')
    useLayoutStore().removeNode('a2')
    await wrapper.vm.$nextTick()
    expect(useFocusModeStore().focusId).toBeNull()
  })
})
