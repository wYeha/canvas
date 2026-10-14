/** DOM-тесты UiTextarea: v-model, aria-label, rows, ошибка, disabled, события клавиатуры и blur, привязка к UiField. */
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiTextarea from '@/views/components/ui-textarea/UiTextarea.vue'

describe('UiTextarea', () => {
  it('v-model: ввод эмитит update:modelValue, значение показывается в поле', async () => {
    const wrapper = mount(UiTextarea, { props: { label: 'Описание', modelValue: 'abc' } })
    const area = wrapper.find('textarea')
    expect((area.element as HTMLTextAreaElement).value).toBe('abc')
    await area.setValue('xyz')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['xyz'])
  })

  it('label уходит в aria-label, placeholder и rows пробрасываются, ошибка — в aria-invalid', () => {
    const wrapper = mount(UiTextarea, { props: { label: 'Описание', placeholder: 'Что внутри', rows: 5, error: true } })
    expect(wrapper.attributes('aria-label')).toBe('Описание')
    expect(wrapper.attributes('placeholder')).toBe('Что внутри')
    expect(wrapper.attributes('rows')).toBe('5')
    expect(wrapper.attributes('aria-invalid')).toBe('true')
    expect(wrapper.classes()).toContain('ui-textarea--error')
  })

  it('disabled блокирует нативное поле', () => {
    const wrapper = mount(UiTextarea, { props: { label: 'Описание', disabled: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('ui-textarea--disabled')
  })

  it('keydown и blur поднимаются наверх', async () => {
    const wrapper = mount(UiTextarea, { props: { label: 'Описание' } })
    await wrapper.trigger('keydown', { key: 'Enter', ctrlKey: true })
    await wrapper.trigger('blur')
    expect(wrapper.emitted('keydown')).toHaveLength(1)
    expect(wrapper.emitted('blur')).toHaveLength(1)
  })

  it('внутри UiField связывается подписью по id без дублирующего aria-label', () => {
    const wrapper = mount(UiField, {
      props: { label: 'Описание' },
      slots: {
        /** Слот: UiTextarea, связанный с подписью поля. */
        default: (slot: { id: string; labelId: string }) =>
          h(UiTextarea, { label: 'Описание', inputAttrs: { id: slot.id, 'aria-labelledby': slot.labelId } }),
      },
    })
    const area = wrapper.find('textarea')
    expect(wrapper.find('label').attributes('for')).toBe(area.attributes('id'))
    expect(area.attributes('aria-label')).toBeUndefined()
    expect(area.attributes('aria-labelledby')).toBe(wrapper.find('label').attributes('id'))
  })
})
