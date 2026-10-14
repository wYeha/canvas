/** DOM-тесты UiDropdown: menu/menuitem, ARIA триггера, клавиатура, danger, клик мимо. */
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import UiDropdown from '@/views/components/ui-dropdown/UiDropdown.vue'

const ITEMS = [
  { value: 'up', label: 'Выше' },
  { value: 'down', label: 'Ниже', disabled: true },
  { value: 'duplicate', label: 'Дублировать' },
  { value: 'delete', label: 'Удалить', danger: true },
]

let mounted: VueWrapper | null = null

/** Монтирует меню в документ (нужен для фокуса) с кнопкой-триггером в слоте. */
function setup(): VueWrapper {
  mounted = mount(UiDropdown, {
    props: { items: ITEMS, label: 'Действия' },
    slots: { trigger: `<template #trigger="{ attrs }"><button type="button" v-bind="attrs">Меню</button></template>` },
    attachTo: document.body,
  })
  return mounted
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('UiDropdown', () => {
  it('триггер получает aria-haspopup=menu и aria-expanded; клик открывает menu с menuitem', async () => {
    const wrapper = setup()
    const button = wrapper.find('button')
    expect(button.attributes('aria-haspopup')).toBe('menu')
    expect(button.attributes('aria-expanded')).toBe('false')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(button.attributes('aria-controls')).toBe(wrapper.find('[role="menu"]').attributes('id'))
    expect(wrapper.findAll('[role="menuitem"]')).toHaveLength(4)
    expect(wrapper.find('.ui-dropdown__item--danger').text()).toBe('Удалить')
  })

  it('стрелки идут по кругу и пропускают недоступные, Enter выбирает пункт и закрывает меню', async () => {
    const wrapper = setup()
    await wrapper.find('button').trigger('keydown', { key: 'ArrowDown' })
    const menu = wrapper.find('[role="menu"]')
    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(menu.attributes('aria-activedescendant')).toBe(wrapper.findAll('[role="menuitem"]')[2]?.attributes('id'))
    await menu.trigger('keydown', { key: 'ArrowUp' })
    await menu.trigger('keydown', { key: 'ArrowUp' })
    expect(menu.attributes('aria-activedescendant')).toBe(wrapper.findAll('[role="menuitem"]')[3]?.attributes('id'))
    await menu.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')?.at(-1)).toEqual(['delete'])
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('ArrowUp на триггере открывает меню на последнем доступном пункте', async () => {
    const wrapper = setup()
    await wrapper.find('button').trigger('keydown', { key: 'ArrowUp' })
    const menu = wrapper.find('[role="menu"]')
    expect(menu.attributes('aria-activedescendant')).toBe(wrapper.findAll('[role="menuitem"]')[3]?.attributes('id'))
  })

  it('Esc закрывает без выбора и возвращает фокус на триггер; клик мимо закрывает', async () => {
    const wrapper = setup()
    await wrapper.find('button').trigger('click')
    await wrapper.find('[role="menu"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(document.activeElement).toBe(wrapper.find('button').element)

    await wrapper.find('button').trigger('click')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })
})
