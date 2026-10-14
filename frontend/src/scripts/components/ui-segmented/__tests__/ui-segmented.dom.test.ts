/** DOM-тесты UiSegmented: radiogroup, roving tabindex, стрелки, v-model, подсказка иконочных сегментов. */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiSegmented from '@/views/components/ui-segmented/UiSegmented.vue'

const OPTIONS = [
  { value: 'row', label: 'Строка', icon: 'flex' as const },
  { value: 'column', label: 'Колонка', icon: 'grid' as const, disabled: true },
  { value: 'wrap', label: 'Перенос' },
  { value: 'nowrap', label: 'Без переноса' },
]

describe('UiSegmented', () => {
  it('radiogroup: роли, aria-checked и roving tabindex у выбранного сегмента', () => {
    const wrapper = mount(UiSegmented, { props: { options: OPTIONS, label: 'Направление', modelValue: 'wrap' } })
    expect(wrapper.attributes('role')).toBe('radiogroup')
    expect(wrapper.attributes('aria-label')).toBe('Направление')
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.map((r) => r.attributes('aria-checked'))).toEqual(['false', 'false', 'true', 'false'])
    expect(radios.map((r) => r.attributes('tabindex'))).toEqual(['-1', '-1', '0', '-1'])
  })

  it('иконочные сегменты получают aria-label и title, текстовые показывают текст', () => {
    const wrapper = mount(UiSegmented, { props: { options: OPTIONS, label: 'Направление' } })
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios[0]?.attributes('aria-label')).toBe('Строка')
    expect(radios[0]?.attributes('title')).toBe('Строка')
    expect(radios[0]?.text()).toBe('')
    expect(radios[2]?.text()).toBe('Перенос')
    // Без выбора в порядке табуляции первый доступный
    expect(radios[0]?.attributes('tabindex')).toBe('0')
  })

  it('стрелки двигают выбор по кругу, пропуская недоступные; клик выбирает', async () => {
    const wrapper = mount(UiSegmented, { props: { options: OPTIONS, label: 'Направление', modelValue: 'row' } })
    const radios = wrapper.findAll('[role="radio"]')
    await radios[0]?.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['wrap'])
    await radios[0]?.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['nowrap'])
    await radios[3]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['nowrap'])
  })

  it('недоступный сегмент и заблокированная группа не выбираются', async () => {
    const wrapper = mount(UiSegmented, { props: { options: OPTIONS, label: 'Направление', disabled: true } })
    await wrapper.findAll('[role="radio"]')[2]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.findAll('[role="radio"]').every((r) => r.attributes('disabled') !== undefined)).toBe(true)
  })
})
