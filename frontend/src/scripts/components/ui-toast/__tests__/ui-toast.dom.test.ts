/** DOM-тесты UiToast: роли по виду, текст, закрытие кнопкой, автоскрытие по таймеру и его отключение. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { TOAST_DURATION_MS } from '@/scripts/components/ui-toast/ui-toast.constants'
import UiToast from '@/views/components/ui-toast/UiToast.vue'

afterEach(() => {
  vi.useRealTimers()
})

describe('UiToast', () => {
  it('ошибка — role alert, обычное сообщение — role status', () => {
    const error = mount(UiToast, { props: { message: 'Файл не открыт', kind: 'error', duration: 0 } })
    expect(error.attributes('role')).toBe('alert')
    expect(error.classes()).toContain('ui-toast--error')
    expect(error.text()).toContain('Файл не открыт')
    expect(mount(UiToast, { props: { message: 'Готово', duration: 0 } }).attributes('role')).toBe('status')
  })

  it('кнопка закрытия эмитит close', async () => {
    const wrapper = mount(UiToast, { props: { message: 'Текст', duration: 0 } })
    await wrapper.find('button[aria-label="Закрыть"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('автоскрытие: close через TOAST_DURATION_MS, не раньше', () => {
    vi.useFakeTimers()
    const wrapper = mount(UiToast, { props: { message: 'Текст' } })
    vi.advanceTimersByTime(TOAST_DURATION_MS - 1)
    expect(wrapper.emitted('close')).toBeUndefined()
    vi.advanceTimersByTime(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('смена текста перезапускает таймер, duration 0 отключает автоскрытие', async () => {
    vi.useFakeTimers()
    const wrapper = mount(UiToast, { props: { message: 'Один' } })
    vi.advanceTimersByTime(TOAST_DURATION_MS - 1)
    await wrapper.setProps({ message: 'Два' })
    vi.advanceTimersByTime(TOAST_DURATION_MS - 1)
    expect(wrapper.emitted('close')).toBeUndefined()

    const pinned = mount(UiToast, { props: { message: 'Тихо', duration: 0 } })
    vi.advanceTimersByTime(TOAST_DURATION_MS * 3)
    expect(pinned.emitted('close')).toBeUndefined()
  })

  it('после размонтирования таймер снят', () => {
    vi.useFakeTimers()
    const wrapper = mount(UiToast, { props: { message: 'Текст' } })
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
