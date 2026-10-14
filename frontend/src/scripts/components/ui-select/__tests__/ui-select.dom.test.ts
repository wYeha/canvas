/** DOM-тесты UiSelect: listbox-паттерн (aria, стрелки, Enter, Esc, typeahead), клик мимо и недоступные пункты. */
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import UiSelect from '@/views/components/ui-select/UiSelect.vue'

const OPTIONS = [
  { value: 'div', label: 'div' },
  { value: 'header', label: 'header', disabled: true },
  { value: 'main', label: 'main' },
  { value: 'nav', label: 'nav' },
]

let mounted: VueWrapper | null = null

/** Монтирует селект в документ (нужен для фокуса) и возвращает функцию чтения последнего эмитированного значения. */
function setup(modelValue: string | null = null): { wrapper: VueWrapper; emitted: () => unknown } {
  const wrapper = mount(UiSelect, { props: { options: OPTIONS, label: 'Тег', modelValue }, attachTo: document.body })
  mounted = wrapper
  return {
    wrapper,
    /** Читает последнее значение, отправленное через update:modelValue. */
    emitted: () => wrapper.emitted('update:modelValue')?.at(-1)?.[0],
  }
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('UiSelect', () => {
  it('кнопка имеет aria-haspopup и aria-expanded; клик открывает listbox с option', async () => {
    const { wrapper } = setup('main')
    const button = wrapper.find('button')
    expect(button.attributes('aria-haspopup')).toBe('listbox')
    expect(button.attributes('aria-expanded')).toBe('false')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true)
    const selected = wrapper.findAll('[role="option"]').filter((o) => o.attributes('aria-selected') === 'true')
    expect(selected.map((o) => o.text())).toEqual(['main'])
  })

  it('имя триггера складывается из подписи и выбранного значения', () => {
    const { wrapper } = setup('main')
    const button = wrapper.find('button')
    expect(button.attributes('aria-label')).toBeUndefined()
    const ids = (button.attributes('aria-labelledby') ?? '').split(' ')
    const names = ids.map((id) => wrapper.find(`#${id}`).text())
    expect(names).toEqual(['Тег', 'main'])
  })

  it('внешняя подпись из UiField (aria-labelledby) заменяет скрытый span', () => {
    const external = mount(UiSelect, {
      props: { options: OPTIONS, label: 'Тег', modelValue: 'nav', inputAttrs: { 'aria-labelledby': 'outer-label' } },
    })
    const ids = (external.find('button').attributes('aria-labelledby') ?? '').split(' ')
    expect(ids[0]).toBe('outer-label')
    expect(external.find('.ui-select__label').exists()).toBe(false)
    external.unmount()
  })

  it('ArrowDown открывает, стрелки пропускают недоступные, Enter выбирает и закрывает', async () => {
    const { wrapper, emitted } = setup(null)
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    const list = wrapper.find('[role="listbox"]')
    await list.trigger('keydown', { key: 'ArrowDown' })
    await list.trigger('keydown', { key: 'Enter' })
    expect(emitted()).toBe('main')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('Home/End, typeahead и Esc: список закрывается без выбора, фокус возвращается на кнопку', async () => {
    const { wrapper, emitted } = setup(null)
    await wrapper.find('button').trigger('click')
    const list = wrapper.find('[role="listbox"]')
    await list.trigger('keydown', { key: 'End' })
    expect(list.attributes('aria-activedescendant')).toBe(wrapper.findAll('[role="option"]')[3]?.attributes('id'))
    await list.trigger('keydown', { key: 'm' })
    expect(list.attributes('aria-activedescendant')).toBe(wrapper.findAll('[role="option"]')[2]?.attributes('id'))
    await list.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(emitted()).toBeUndefined()
    expect(document.activeElement).toBe(wrapper.find('button').element)
  })

  it('клик мимо закрывает список, клик по недоступному пункту ничего не выбирает', async () => {
    const { wrapper, emitted } = setup(null)
    await wrapper.find('button').trigger('click')
    await wrapper.findAll('[role="option"]')[1]?.trigger('click')
    expect(emitted()).toBeUndefined()
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })
})
