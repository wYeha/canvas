/** DOM-тесты UiChips: v-model, aria-pressed у подходящего чипа, недоступные чипы. */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiChips from '@/views/components/ui-chips/UiChips.vue'

const OPTIONS = [
  { value: '1920', label: '1920' },
  { value: '1440', label: '1440' },
  { value: '480', label: '480', disabled: true },
]

describe('UiChips', () => {
  it('подсвечивает чип со значением модели через aria-pressed', () => {
    const wrapper = mount(UiChips, { props: { options: OPTIONS, label: 'Ширина', modelValue: '1440' } })
    expect(wrapper.attributes('role')).toBe('group')
    expect(wrapper.attributes('aria-label')).toBe('Ширина')
    const pressed = wrapper.findAll('button').map((b) => b.attributes('aria-pressed'))
    expect(pressed).toEqual(['false', 'true', 'false'])
    expect(wrapper.findAll('button')[1]?.classes()).toContain('ui-chips__chip--selected')
  })

  it('клик задаёт значение (v-model); недоступный чип заблокирован', async () => {
    const wrapper = mount(UiChips, { props: { options: OPTIONS, label: 'Ширина' } })
    await wrapper.findAll('button')[0]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['1920'])
    await wrapper.findAll('button')[2]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  })
})
