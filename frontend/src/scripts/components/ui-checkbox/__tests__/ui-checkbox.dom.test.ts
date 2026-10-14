/** DOM-тесты UiCheckbox: подпись, v-model по клику, недоступность. */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiCheckbox from '@/views/components/ui-checkbox/UiCheckbox.vue'

describe('UiCheckbox', () => {
  it('показывает подпись и состояние', () => {
    const wrapper = mount(UiCheckbox, { props: { label: 'Дашборд', modelValue: true } })
    expect(wrapper.text()).toContain('Дашборд')
    expect(wrapper.get('input').element.checked).toBe(true)
  })

  it('клик меняет значение (v-model)', async () => {
    const wrapper = mount(UiCheckbox, { props: { label: 'Дашборд', modelValue: false } })
    await wrapper.get('input').setValue(true)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
  })

  it('disabled: нативный атрибут и модификатор', () => {
    const wrapper = mount(UiCheckbox, { props: { label: 'Дашборд', disabled: true } })
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('ui-checkbox--disabled')
  })
})
