/** DOM-тесты UiNumberInput: v-model, стрелки с Shift, Enter/blur, откат нечисла, Esc, пусто → null, aria. */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import UiNumberInput from '@/views/components/ui-number-input/UiNumberInput.vue'

/** Монтирует поле с реальным двусторонним v-model и возвращает обёртку и функцию чтения значения. */
function setup(initial: number | null, props: Record<string, unknown> = {}) {
  const state = { value: initial }
  const wrapper = mount(UiNumberInput, {
    props: {
      label: 'Gap',
      modelValue: initial,
      /** Обновляет состояние и пропсы, как это делает родительский v-model. */
      'onUpdate:modelValue': (value: number | null) => {
        state.value = value
        void wrapper.setProps({ modelValue: value })
      },
      ...props,
    },
  })
  return { wrapper, input: wrapper.find('input'), state }
}

describe('UiNumberInput', () => {
  it('nullable=false: пустой ввод на Enter и blur откатывается, null не эмитится', async () => {
    const { input, state } = setup(5, { nullable: false })
    await input.setValue('')
    await input.trigger('keydown', { key: 'Enter' })
    expect(state.value).toBe(5)
    expect((input.element as HTMLInputElement).value).toBe('5')
    await input.setValue('  ')
    await input.trigger('blur')
    expect(state.value).toBe(5)
    expect((input.element as HTMLInputElement).value).toBe('5')
  })

  it('стрелки меняют значение на шаг, Shift — ×10, с учётом min/max', async () => {
    const { input, state } = setup(10, { step: 2, min: 0, max: 30 })
    await input.trigger('keydown', { key: 'ArrowUp' })
    expect(state.value).toBe(12)
    await input.trigger('keydown', { key: 'ArrowUp', shiftKey: true })
    expect(state.value).toBe(30)
    expect((input.element as HTMLInputElement).value).toBe('30')
    await input.trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    expect(state.value).toBe(10)
  })

  it('Enter фиксирует число, пустое значение даёт null, нечисло откатывается на blur', async () => {
    const { input, state } = setup(5)
    await input.setValue('42')
    await input.trigger('keydown', { key: 'Enter' })
    expect(state.value).toBe(42)

    await input.setValue('abc')
    await input.trigger('blur')
    expect(state.value).toBe(42)
    expect((input.element as HTMLInputElement).value).toBe('42')

    await input.setValue('')
    await input.trigger('blur')
    expect(state.value).toBeNull()
  })

  it('Esc отменяет правку и возвращает текст значения модели', async () => {
    const { input, state } = setup(7)
    await input.setValue('999')
    await input.trigger('keydown', { key: 'Escape' })
    expect((input.element as HTMLInputElement).value).toBe('7')
    expect(state.value).toBe(7)
  })

  it('показывает единицу и отдаёт spinbutton-атрибуты', () => {
    const { wrapper, input } = setup(8, { unit: 'px', min: 0, max: 100 })
    expect(wrapper.find('.ui-text-input__suffix').text()).toBe('px')
    expect(input.attributes('role')).toBe('spinbutton')
    expect(input.attributes('aria-valuenow')).toBe('8')
    expect(input.attributes('aria-valuemax')).toBe('100')
    expect(input.attributes('aria-valuetext')).toBe('8 px')
  })
})

describe('UiNumberInput: Esc и всплытие', () => {
  it('первый Esc с изменённым черновиком только отменяет правку и не всплывает; Esc без правки всплывает', async () => {
    const { wrapper, input } = setup(7)
    const outer: string[] = []
    /** Запоминает клавиши, дошедшие до внешнего элемента. */
    const record = (event: Event): void => {
      outer.push((event as KeyboardEvent).key)
    }
    ;(wrapper.element as HTMLElement).addEventListener('keydown', record)
    await input.setValue('999')
    await input.trigger('keydown', { key: 'Escape' })
    expect(outer).toEqual([])
    expect((input.element as HTMLInputElement).value).toBe('7')
    await input.trigger('keydown', { key: 'Escape' })
    expect(outer).toEqual(['Escape'])
  })
})
