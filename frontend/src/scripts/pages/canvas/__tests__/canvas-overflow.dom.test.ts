/**
 * DOM-тест честного переполнения (16.4): блок «Фикс.» с числом обрезается, вылезающий ребёнок даёт бейдж «+1 скрыто ↓»
 * и метку у края, клик по бейджу временно раскрывает блок, в «Структуре» обрезки нет. Размеры раскладки подменены.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { useViewSettingsStore } from '@/scripts/pages/canvas/view-settings-store'
import CanvasViewport from '@/views/pages/canvas/CanvasViewport.vue'
import { makeDoc } from './tree-fixture'

/** Подменяемые свойства раскладки и их исходные описания. */
const STUBBED = ['clientHeight', 'clientWidth', 'offsetTop', 'offsetHeight'] as const
const original = new Map(STUBBED.map((key) => [key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key)]))

let mounted: VueWrapper | null = null

afterEach(() => {
  mounted?.unmount()
  mounted = null
  for (const [key, descriptor] of original) {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, key, descriptor)
  }
})

/** Подменяет размер: у обрезаемого блока высота 80, у ребёнка a1y верх 100 (за рамкой), у всех детей высота 40. */
function stubLayout(): void {
  /** Геттер-заглушка по элементу. */
  function getter(compute: (el: HTMLElement) => number) {
    /** Значение свойства для элемента. */
    function get(this: HTMLElement): number {
      return compute(this)
    }
    return { configurable: true, get }
  }
  Object.defineProperty(
    HTMLElement.prototype,
    'clientHeight',
    getter((el) => (el.hasAttribute('data-clip') ? 80 : 0)),
  )
  Object.defineProperty(
    HTMLElement.prototype,
    'clientWidth',
    getter(() => 200),
  )
  Object.defineProperty(
    HTMLElement.prototype,
    'offsetHeight',
    getter(() => 40),
  )
  Object.defineProperty(
    HTMLElement.prototype,
    'offsetTop',
    getter((el) => (el.getAttribute('data-node-id') === 'a1y' ? 100 : 20)),
  )
}

/** Ждёт перерисовку и кадр замера. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50))
}

/** Поле с документом, где у grid-блока a1 фиксированная высота 80px. */
async function setup(): Promise<VueWrapper> {
  stubLayout()
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useLayoutStore()
  store.loadDocument(makeDoc())
  store.updateNode('a1', { self: { heightMode: 'fixed', height: '80px' } })
  mounted = mount(CanvasViewport, { global: { plugins: [pinia] }, attachTo: document.body })
  await settle()
  return mounted
}

describe('честное переполнение', () => {
  it('обрезка, метка у края и бейдж «+1 скрыто ↓»; клик раскрывает и снова сворачивает', async () => {
    const wrapper = await setup()
    const block = wrapper.get('[data-node-id="a1"]')
    expect(block.classes()).toEqual(expect.arrayContaining(['canvas-node--clip-y', 'canvas-node--overflow-y']))
    const badge = wrapper.get('[data-node-id="a1"] .canvas-node__overflow')
    expect(badge.text()).toBe('+1 скрыто ↓')
    await badge.trigger('click')
    await settle()
    expect(block.classes()).not.toContain('canvas-node--clip-y')
    expect(wrapper.get('[data-node-id="a1"] .canvas-node__overflow').text()).toBe('свернуть ↑')
    await wrapper.get('[data-node-id="a1"] .canvas-node__overflow').trigger('click')
    await settle()
    expect(block.classes()).toContain('canvas-node--clip-y')
  })

  it('в «Структуре» чисел нет: ни обрезки, ни бейджа, на чипе значок размера', async () => {
    const wrapper = await setup()
    useViewSettingsStore().toggleSizesShown()
    await settle()
    const block = wrapper.get('[data-node-id="a1"]')
    expect(block.classes()).not.toContain('canvas-node--clip-y')
    expect(wrapper.find('[data-node-id="a1"] .canvas-node__overflow').exists()).toBe(false)
    expect(block.attributes('style')).not.toContain('height')
    expect(wrapper.get('[data-node-id="a1"] .canvas-node__size').text()).toBe('⊤80px⊥')
    useViewSettingsStore().toggleSizesShown()
  })
})
