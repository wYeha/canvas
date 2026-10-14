/** DOM-тесты UiButton: недоступность (атрибут и клик), вид danger, подсказка клавиши. */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiButton from '@/views/components/ui-button/UiButton.vue'

describe('UiButton', () => {
  it('в обычном состоянии отдаёт click и не имеет disabled', async () => {
    const wrapper = mount(UiButton, { slots: { default: 'Удалить' } })
    expect(wrapper.attributes('disabled')).toBeUndefined()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('disabled: нативный атрибут выставлен, click не срабатывает', async () => {
    const wrapper = mount(UiButton, { props: { disabled: true }, slots: { default: 'Удалить' } })
    expect(wrapper.attributes('disabled')).toBeDefined()
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })

  it('вариант danger даёт BEM-модификатор, hint — только kbd, keyshortcuts — aria-keyshortcuts', () => {
    const wrapper = mount(UiButton, {
      props: { variant: 'danger', hint: 'F', keyshortcuts: 'Control+F' },
      slots: { default: 'Flex' },
    })
    expect(wrapper.classes()).toContain('ui-button--variant-danger')
    expect(wrapper.attributes('aria-keyshortcuts')).toBe('Control+F')
    expect(wrapper.find('.ui-button__hint').text()).toBe('F')
  })
})
