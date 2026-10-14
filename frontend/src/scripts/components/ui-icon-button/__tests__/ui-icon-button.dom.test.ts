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
