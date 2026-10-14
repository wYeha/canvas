/** DOM-тесты связки UiField со всеми контролами: подпись программно связана через id или aria-labelledby. */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import UiChips from '@/views/components/ui-chips/UiChips.vue'
import UiField from '@/views/components/ui-field/UiField.vue'
import UiNumberInput from '@/views/components/ui-number-input/UiNumberInput.vue'
import UiSegmented from '@/views/components/ui-segmented/UiSegmented.vue'
import UiSelect from '@/views/components/ui-select/UiSelect.vue'
import type { UiFieldSlotProps } from '@/scripts/components/ui-field/ui-field.types'

const OPTIONS = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B' },
]

/** Оборачивает контрол в UiField: контрол получает id, aria-labelledby и aria-describedby из слота. */
function fieldWith(control: (slot: UiFieldSlotProps) => ReturnType<typeof h>) {
  return mount(
    defineComponent({
      /** Рендерит UiField с контролом в слоте. */
      render: () => h(UiField, { label: 'Подпись', hint: 'Подсказка' }, { default: control }),
    }),
  )
}

/** Собирает inputAttrs из данных слота UiField. */
function attrsOf(slot: UiFieldSlotProps): Record<string, string | undefined> {
  return { id: slot.id, 'aria-labelledby': slot.labelId, 'aria-describedby': slot.describedBy }
}

describe('UiField + контролы', () => {
  it('UiNumberInput: id поля совпадает с for подписи, описание — подсказка', () => {
    const wrapper = fieldWith((slot) => h(UiNumberInput, { label: 'Gap', inputAttrs: attrsOf(slot) }))
    const input = wrapper.find('input')
    expect(wrapper.find('label').attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('aria-labelledby')).toBe(wrapper.find('label').attributes('id'))
    expect(input.attributes('aria-describedby')).toBe(wrapper.find('.ui-field__message').attributes('id'))
    expect(input.attributes('role')).toBe('spinbutton')
  })

  it('UiSelect: id и описание попадают на кнопку-триггер', () => {
    const wrapper = fieldWith((slot) => h(UiSelect, { label: 'Тег', options: OPTIONS, inputAttrs: attrsOf(slot) }))
    const button = wrapper.find('button')
    expect(wrapper.find('label').attributes('for')).toBe(button.attributes('id'))
    expect(button.attributes('aria-describedby')).toBe(wrapper.find('.ui-field__message').attributes('id'))
  })

  it('UiSegmented и UiChips: группа названа подписью через aria-labelledby', () => {
    const segmented = fieldWith((slot) =>
      h(UiSegmented, { label: 'Направление', options: OPTIONS, inputAttrs: attrsOf(slot) }),
    )
    const group = segmented.find('[role="radiogroup"]')
    expect(group.attributes('aria-labelledby')).toBe(segmented.find('label').attributes('id'))
    expect(group.attributes('aria-describedby')).toBe(segmented.find('.ui-field__message').attributes('id'))

    const chips = fieldWith((slot) => h(UiChips, { label: 'Ширина', options: OPTIONS, inputAttrs: attrsOf(slot) }))
    expect(chips.find('[role="group"]').attributes('aria-labelledby')).toBe(chips.find('label').attributes('id'))
  })
})
