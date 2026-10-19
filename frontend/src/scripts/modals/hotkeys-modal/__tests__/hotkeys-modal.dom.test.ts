/** DOM-тесты HotkeysModal: заголовок, группы и чипы клавиш, открытие по `?` на странице, блокировка хоткеев, закрытие Esc. */
import { afterEach, describe, expect, it } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { HOTKEY_GROUPS, HOTKEYS_MODAL_TITLE } from '@/scripts/modals/hotkeys-modal/hotkeys-modal.constants'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import CanvasPage from '@/views/pages/canvas/CanvasPage.vue'
import HotkeysModal from '@/views/modals/hotkeys-modal/HotkeysModal.vue'

let mounted: VueWrapper | null = null

/** Окно телепортируется в body, поэтому искать надо в документе. */
function page(): DOMWrapper<HTMLElement> {
  return new DOMWrapper(document.body)
}

/** Нажатие клавиши на window, как у глобальных хоткеев. */
function press(init: KeyboardEventInit): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
}

/** Монтирует страницу canvas с пустым документом. */
function mountPage(): void {
  const pinia = createPinia()
  setActivePinia(pinia)
  mounted = mount(CanvasPage, { global: { plugins: [pinia] }, attachTo: document.body })
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('HotkeysModal', () => {
  it('показывает заголовок, все группы и строки', () => {
    mounted = mount(HotkeysModal, { props: { open: true }, attachTo: document.body })
    expect(page().find('.ui-modal__title').text()).toBe(HOTKEYS_MODAL_TITLE)
    const titles = page()
      .findAll('.hotkeys-modal__title')
      .map((t) => t.text())
    expect(titles).toEqual(HOTKEY_GROUPS.map((g) => g.title))
    const rowCount = HOTKEY_GROUPS.reduce((sum, g) => sum + g.rows.length, 0)
    expect(page().findAll('.hotkeys-modal__action')).toHaveLength(rowCount)
    expect(page().findAll('.hotkeys-modal__key').length).toBeGreaterThan(rowCount)
  })

  it('закрыто — ничего не рисует', () => {
    mounted = mount(HotkeysModal, { props: { open: false }, attachTo: document.body })
    expect(page().find('.hotkeys-modal__table').exists()).toBe(false)
  })
})

describe('страница: клавиша ?', () => {
  it('? открывает окно, пока оно открыто хоткеи канваса заблокированы, Esc закрывает', async () => {
    mountPage()
    const store = useLayoutStore()
    press({ key: '?', code: 'Slash', shiftKey: true })
    await flushPromises()
    expect(page().find('.hotkeys-modal__table').exists()).toBe(true)
    const before = store.document.roots.length
    press({ key: 'f', code: 'KeyF' })
    await flushPromises()
    expect(store.document.roots.length).toBe(before)
    await page().find('.ui-modal__dialog').trigger('keydown', { key: 'Escape' })
    await flushPromises()
    expect(page().find('.hotkeys-modal__table').exists()).toBe(false)
  })

  it('кнопка «?» в хедере открывает окно', async () => {
    mountPage()
    await page().find('button[aria-label="Горячие клавиши"]').trigger('click')
    await flushPromises()
    expect(page().find('.hotkeys-modal__table').exists()).toBe(true)
  })

  it('в поле ввода ? не открывает окно', async () => {
    mountPage()
    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '?', shiftKey: true, bubbles: true, cancelable: true }))
    await flushPromises()
    input.remove()
    expect(page().find('.hotkeys-modal__table').exists()).toBe(false)
  })
})
