/** DOM-тесты UiSwitch: role=switch, aria-checked, v-model по клику, недоступность, привязка к UiField. */
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiSwitch from '@/views/components/ui-switch/UiSwitch.vue'

describe('UiSwitch', () => {
  it('role=switch с aria-checked и подписью', () => {
    const wrapper = mount(UiSwitch, { props: { label: 'max-width', modelValue: true } })
    expect(wrapper.attributes('role')).toBe('switch')
    expect(wrapper.attributes('aria-checked')).toBe('true')
    expect(wrapper.attributes('aria-label')).toBe('max-width')
    expect(wrapper.classes()).toContain('ui-switch--on')
  })

  it('клик переключает значение (v-model); недоступный не реагирует', async () => {
    const wrapper = mount(UiSwitch, { props: { label: 'max-width', modelValue: false } })
    await wrapper.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
    const disabled = mount(UiSwitch, { props: { label: 'max-width', disabled: true } })
    await disabled.trigger('click')
    expect(disabled.emitted('update:modelValue')).toBeUndefined()
  })

  it('внутри UiField: id связан с подписью, aria-label не дублирует aria-labelledby', () => {
    const wrapper = mount(UiField, {
      props: { label: 'Экспорт' },
      slots: {
        /** Слот поля: отдаёт переключатель с атрибутами из UiField. */
        default: ({ id, labelId }: { id: string; labelId: string }) =>
          h(UiSwitch, { label: 'Экспорт', inputAttrs: { id, 'aria-labelledby': labelId } }),
      },
    })
    const control = wrapper.find('button')
    expect(wrapper.find('label').attributes('for')).toBe(control.attributes('id'))
    expect(control.attributes('aria-labelledby')).toBe(wrapper.find('label').attributes('id'))
    expect(control.attributes('aria-label')).toBeUndefined()
  })
})
