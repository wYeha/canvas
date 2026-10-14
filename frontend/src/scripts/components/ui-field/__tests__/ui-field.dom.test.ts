/** DOM-тесты UiField: связь label→control через id, aria-describedby для подсказки и ошибки. */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiField from '@/views/components/ui-field/UiField.vue'

/** Монтирует поле с нативным input в слоте, привязанным к данным слота. */
function setup(props: { hint?: string; error?: string }) {
  return mount(UiField, {
    props: { label: 'Gap', ...props },
    slots: {
      default: `<template #default="{ id, describedBy, invalid }">
        <input :id="id" :aria-describedby="describedBy" :aria-invalid="invalid ? 'true' : undefined" />
      </template>`,
    },
  })
}

describe('UiField', () => {
  it('label связан с контролом через for/id', () => {
    const wrapper = setup({})
    const label = wrapper.find('label')
    expect(label.text()).toBe('Gap')
    expect(label.attributes('for')).toBe(wrapper.find('input').attributes('id'))
    expect(wrapper.find('input').attributes('aria-describedby')).toBeUndefined()
  })

  it('подсказка описывает контрол через aria-describedby', () => {
    const wrapper = setup({ hint: 'В пикселях' })
    const hint = wrapper.find('.ui-field__message')
    expect(hint.text()).toBe('В пикселях')
    expect(wrapper.find('input').attributes('aria-describedby')).toBe(hint.attributes('id'))
  })

  it('ошибка заменяет подсказку и помечает контрол как невалидный', () => {
    const wrapper = setup({ hint: 'В пикселях', error: 'Только число' })
    const message = wrapper.find('.ui-field__message')
    expect(message.text()).toBe('Только число')
    expect(message.classes()).toContain('ui-field__message--error')
    expect(wrapper.find('input').attributes('aria-describedby')).toBe(message.attributes('id'))
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
  })
})
