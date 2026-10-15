/** DOM-тесты выпадашки документов: ARIA, список с метой, переименование и удаление в строке, недоступные пункты, демо. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import { useDocumentsStore } from '@/scripts/pages/canvas/documents-store'
import CanvasDocsMenu from '@/views/pages/canvas/CanvasDocsMenu.vue'

let mounted: VueWrapper | null = null

/** Готовит хранилища с одним документом и монтирует меню в документ (нужен для фокуса). */
function setup(demo = false): VueWrapper {
  const pinia = createPinia()
  setActivePinia(pinia)
  useDocumentsStore().init({ demo })
  mounted = mount(CanvasDocsMenu, { global: { plugins: [pinia] }, attachTo: document.body })
  return mounted
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  vi.restoreAllMocks()
})

describe('CanvasDocsMenu', () => {
  it('триггер показывает название и открывает menu: документ с галочкой и метой, три действия внизу', async () => {
    const wrapper = setup()
    const trigger = wrapper.find('button')
    expect(trigger.text()).toBe('Без названия')
    expect(trigger.attributes('aria-haspopup')).toBe('menu')
    await trigger.trigger('click')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    const radio = wrapper.find('[role="menuitemradio"]')
    expect(radio.attributes('aria-checked')).toBe('true')
    expect(radio.text()).toContain('изменён только что · 0 корневых')
    const actions = wrapper.findAll('[role="menuitem"]')
    expect(actions.map((a) => a.text())).toEqual(['Новый документ', 'Открыть .json…', 'Сохранить в .json'])
    expect(actions.map((a) => a.attributes('aria-disabled'))).toEqual([undefined, undefined, undefined])
  })

  it('«Новый документ» создаёт документ, делает его текущим и закрывает меню', async () => {
    const wrapper = setup()
    await wrapper.find('button').trigger('click')
    await wrapper.findAll('[role="menuitem"]')[0]?.trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(useDocumentsStore().entries).toHaveLength(2)
  })

  it('переименование в строке: Enter применяет, пустое имя откатывается', async () => {
    const wrapper = setup()
    await wrapper.find('button').trigger('click')
    await wrapper.find('button[aria-label="Переименовать"]').trigger('click')
    const input = wrapper.find('input:not([type="file"])')
    await input.setValue('Лендинг')
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'Enter' })
    expect(wrapper.find('input:not([type="file"])').exists()).toBe(false)
    expect(wrapper.find('.canvas-docs-menu__name').text()).toBe('Лендинг')
    expect(wrapper.find('.canvas-docs-menu__button').text()).toBe('Лендинг')

    await wrapper.find('button[aria-label="Переименовать"]').trigger('click')
    await wrapper.find('input:not([type="file"])').setValue('   ')
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'Enter' })
    expect(wrapper.find('.canvas-docs-menu__name').text()).toBe('Лендинг')
  })

  it('Esc в поле отменяет переименование и не закрывает меню', async () => {
    const wrapper = setup()
    await wrapper.find('button').trigger('click')
    await wrapper.find('button[aria-label="Переименовать"]').trigger('click')
    await wrapper.find('input:not([type="file"])').setValue('Другое')
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(true)
    expect(wrapper.find('input:not([type="file"])').exists()).toBe(false)
    expect(wrapper.find('.canvas-docs-menu__name').text()).toBe('Без названия')
  })

  it('удаление с подтверждением в строке: «Отмена» оставляет документ, «Удалить» заменяет его новым пустым', async () => {
    const wrapper = setup()
    const documents = useDocumentsStore()
    const firstId = documents.currentId
    await wrapper.find('button').trigger('click')
    await wrapper.find('button[aria-label="Удалить"]').trigger('click')
    expect(wrapper.find('.canvas-docs-menu__confirm-text').text()).toBe('Удалить «Без названия»?')
    const [cancel, confirm] = wrapper.findAll('.canvas-docs-menu__confirm-button')
    await cancel?.trigger('click')
    expect(documents.currentId).toBe(firstId)
    expect(wrapper.find('.canvas-docs-menu__confirm').exists()).toBe(false)

    await wrapper.find('button[aria-label="Удалить"]').trigger('click')
    await wrapper.findAll('.canvas-docs-menu__confirm-button')[1]?.trigger('click')
    expect(confirm).toBeDefined()
    expect(documents.currentId).not.toBe(firstId)
    expect(documents.entries).toHaveLength(1)
  })

  it('F2 и Delete на активной строке включают переименование и подтверждение удаления', async () => {
    const wrapper = setup()
    await wrapper.find('button').trigger('click')
    const menu = wrapper.find('[role="menu"]')
    await menu.trigger('keydown', { key: 'F2' })
    expect(wrapper.find('input:not([type="file"])').exists()).toBe(true)
    await menu.trigger('keydown', { key: 'Escape' })
    await menu.trigger('keydown', { key: 'Delete' })
    expect(wrapper.find('.canvas-docs-menu__confirm').exists()).toBe(true)
  })

  it('в демо кнопка недоступна, меню не открывается, название — демо-документа', async () => {
    const wrapper = setup(true)
    const trigger = wrapper.find('button')
    expect(trigger.attributes('disabled')).toBeDefined()
    await trigger.trigger('click')
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})
