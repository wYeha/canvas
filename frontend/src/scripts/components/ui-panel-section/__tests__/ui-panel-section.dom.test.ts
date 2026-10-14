/** DOM-тесты UiPanelSection: aria-expanded/aria-controls, сворачивание по клику, v-model:open, hint. */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiPanelSection from '@/views/components/ui-panel-section/UiPanelSection.vue'

describe('UiPanelSection', () => {
  it('по умолчанию раскрыта; кнопка связана с телом через aria-controls', () => {
    const wrapper = mount(UiPanelSection, { props: { title: 'Блок', hint: 'div' }, slots: { default: 'Содержимое' } })
    const toggle = wrapper.find('button')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find(`#${toggle.attributes('aria-controls') ?? ''}`).text()).toBe('Содержимое')
    expect(wrapper.find('.ui-panel-section__hint').text()).toBe('div')
  })

  it('клик эмитит update:open и сворачивает тело (v-model:open)', async () => {
    const wrapper = mount(UiPanelSection, {
      props: {
        title: 'Блок',
        open: true,
        /** Применяет новое значение к пропсу, как это делает родительский v-model. */
        'onUpdate:open': (value: boolean) => wrapper.setProps({ open: value }),
      },
      slots: { default: 'Содержимое' },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.ui-panel-section__body').attributes('style')).toContain('display: none')
    expect(wrapper.find('.ui-panel-section__chevron').classes()).toContain('ui-panel-section__chevron--collapsed')
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('button').attributes('aria-expanded')).toBe('true')
  })
})
