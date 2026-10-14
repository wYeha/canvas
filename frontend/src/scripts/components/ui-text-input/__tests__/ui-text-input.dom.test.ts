/** DOM-тесты UiTextInput: v-model, aria-label, состояние ошибки, префикс и disabled. */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiTextInput from '@/views/components/ui-text-input/UiTextInput.vue'

describe('UiTextInput', () => {
  it('v-model: ввод эмитит update:modelValue, значение показывается в поле', async () => {
    const wrapper = mount(UiTextInput, { props: { label: 'Подпись', modelValue: 'abc' } })
    const input = wrapper.find('input')
    expect((input.element as HTMLInputElement).value).toBe('abc')
    await input.setValue('xyz')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['xyz'])
  })

  it('label уходит в aria-label, ошибка — в aria-invalid и модификатор', () => {
    const wrapper = mount(UiTextInput, { props: { label: 'Подпись', error: true, prefix: 'gap' } })
    const input = wrapper.find('input')
    expect(input.attributes('aria-label')).toBe('Подпись')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(wrapper.classes()).toContain('ui-text-input--error')
    expect(wrapper.find('.ui-text-input__prefix').text()).toBe('gap')
  })

  it('disabled блокирует нативное поле', () => {
    const wrapper = mount(UiTextInput, { props: { label: 'Подпись', disabled: true } })
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('ui-text-input--disabled')
  })
})
