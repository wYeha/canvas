/** DOM-тесты UiModal: aria диалога, Esc, клик по оверлею, фокус-ловушка, возврат фокуса и блокировка прокрутки. */
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import UiModal from '@/views/components/ui-modal/UiModal.vue'

let mounted: VueWrapper | null = null

/** Монтирует страницу с кнопкой-инициатором и модалкой с двумя кнопками в теле; Teleport заменён заглушкой на месте. */
function setup(initiallyOpen = false): VueWrapper {
  const Host = defineComponent({
    /** Рендерит инициатор и модалку с двумя полями и кнопкой в футере. */
    setup() {
      const open = ref(initiallyOpen)
      /** Открывает окно по клику на инициатор. */
      const show = (): void => {
        open.value = true
      }
      /** Применяет значение v-model:open. */
      const update = (value: boolean): void => {
        open.value = value
      }
      /** Тело окна: два поля. */
      const body = () => [h('input', { id: 'first' }), h('input', { id: 'second' })]
      /** Футер окна: одна кнопка. */
      const footer = () => h('button', { id: 'last' }, 'Готово')
      return () => [
        h('button', { id: 'opener', onClick: show }, 'Открыть'),
        h(UiModal, { title: 'Экспорт', open: open.value, 'onUpdate:open': update }, { default: body, footer }),
      ]
    },
  })
  mounted = mount(Host, { attachTo: document.body, global: { stubs: { teleport: true } } })
  return mounted
}

/** Ждёт фокус внутри окна после открытия (nextTick в composable). */
async function opened(wrapper: VueWrapper): Promise<void> {
  // Программный click не двигает фокус, как это делает настоящий клик, поэтому фокусируем инициатор сами
  ;(wrapper.find('#opener').element as HTMLElement).focus()
  await wrapper.find('#opener').trigger('click')
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

afterEach(() => {
  mounted?.unmount()
  mounted = null
})

describe('UiModal', () => {
  it('диалог имеет role=dialog, aria-modal и aria-labelledby на заголовок; фокус уходит на первый элемент', async () => {
    const wrapper = setup()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await opened(wrapper)
    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.find(`#${dialog.attributes('aria-labelledby') ?? ''}`).text()).toBe('Экспорт')
    // Первый фокусируемый элемент — кнопка «Закрыть» в шапке
    expect(document.activeElement).toBe(wrapper.find('.ui-icon-button').element)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('Esc закрывает окно, фокус возвращается инициатору, прокрутка разблокируется', async () => {
    const wrapper = setup()
    await opened(wrapper)
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.find('#opener').element)
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('клик по оверлею закрывает, клик внутри диалога — нет', async () => {
    const wrapper = setup()
    await opened(wrapper)
    await wrapper.find('.ui-modal__body').trigger('mousedown')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    await wrapper.find('.ui-modal').trigger('mousedown')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('фокус-ловушка: Tab с последнего элемента идёт на первый, Shift+Tab с первого — на последний', async () => {
    const wrapper = setup()
    await opened(wrapper)
    const dialog = wrapper.find('[role="dialog"]')
    const first = wrapper.find('.ui-icon-button').element as HTMLElement
    const last = wrapper.find('#last').element as HTMLElement
    last.focus()
    await dialog.trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    await dialog.trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
})
