/** DOM-тесты фрагмента «Положение» (15.3): вид, край прилипания и угол пишутся в `self.position`, «Обычно» стирает поле. */
import { afterEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { findNode } from '@/scripts/pages/canvas/tree-query'
import CanvasPropsPosition from '@/views/pages/canvas/CanvasPropsPosition.vue'
import { makeDoc } from './tree-fixture'

let mounted: VueWrapper | null = null

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

/** Монтирует фрагмент с выделенным вложенным блоком a2. */
function setup(): { wrapper: VueWrapper; store: ReturnType<typeof useLayoutStore> } {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useLayoutStore()
  store.loadDocument(makeDoc())
  store.select('a2')
  mounted = mount(CanvasPropsPosition, { global: { plugins: [pinia] }, attachTo: document.body })
  return { wrapper: mounted, store }
}

/** Кнопка сегмента по видимому тексту или имени для скринридера. */
async function click(wrapper: VueWrapper, name: string): Promise<void> {
  const button = wrapper
    .findAll('[role="radio"]')
    .find((item) => item.text() === name || item.attributes('aria-label') === name)
  if (button === undefined) throw new Error(`нет кнопки «${name}»`)
  await button.trigger('click')
}

describe('CanvasPropsPosition', () => {
  it('«Прилипает» ставит sticky-top, «Снизу» — sticky-bottom, «Обычно» стирает поле', async () => {
    const { wrapper, store } = setup()
    await click(wrapper, 'Прилипает')
    expect(findNode(store.document, 'a2')?.self.position).toBe('sticky-top')
    await click(wrapper, 'Снизу')
    expect(findNode(store.document, 'a2')?.self.position).toBe('sticky-bottom')
    await click(wrapper, 'Обычно')
    expect(findNode(store.document, 'a2')?.self).not.toHaveProperty('position')
  })

  it('«Поверх» — правый верхний угол, угол меняется кнопкой со стрелкой и именем', async () => {
    const { wrapper, store } = setup()
    await click(wrapper, 'Поверх')
    expect(findNode(store.document, 'a2')?.self.position).toBe('top-right')
    expect(wrapper.text()).toContain('↙')
    await click(wrapper, 'Снизу слева')
    expect(findNode(store.document, 'a2')?.self.position).toBe('bottom-left')
  })
})
