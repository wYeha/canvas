/** DOM-тесты UiIconButton: подпись в aria-label и title, недоступность. */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiIconButton from '@/views/components/ui-icon-button/UiIconButton.vue'

describe('UiIconButton', () => {
  it('подпись попадает в aria-label и title, иконка скрыта от скринридера', () => {
    const wrapper = mount(UiIconButton, { props: { icon: 'undo', label: 'Отменить' } })
    expect(wrapper.attributes('aria-label')).toBe('Отменить')
    expect(wrapper.attributes('title')).toBe('Отменить')
    expect(wrapper.find('svg').attributes('aria-hidden')).toBe('true')
  })

  it('disabled: нативный атрибут выставлен, click не срабатывает', async () => {
    const wrapper = mount(UiIconButton, { props: { icon: 'plus', label: 'Добавить', disabled: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})

describe('UiIconButton: переключатель', () => {
  it('без pressed атрибута aria-pressed нет', () => {
    const wrapper = mount(UiIconButton, { props: { icon: 'tag', label: 'Подписи' } })
    expect(wrapper.attributes('aria-pressed')).toBeUndefined()
    expect(wrapper.classes()).not.toContain('ui-icon-button--pressed')
  })

  it('pressed выставляет aria-pressed и модификатор', async () => {
    const wrapper = mount(UiIconButton, { props: { icon: 'tag', label: 'Подписи', pressed: true } })
    expect(wrapper.attributes('aria-pressed')).toBe('true')
    expect(wrapper.classes()).toContain('ui-icon-button--pressed')
    await wrapper.setProps({ pressed: false })
    expect(wrapper.attributes('aria-pressed')).toBe('false')
    expect(wrapper.classes()).not.toContain('ui-icon-button--pressed')
  })
})
