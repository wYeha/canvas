/** DOM-тесты ExportModal: охват, чекбоксы корней, копирование с «Скопировано» на 2 с, отсутствие script, фокус. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { EXPORT_COPIED_MS } from '@/scripts/modals/export-modal/export-modal.constants'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import ExportModal from '@/views/modals/export-modal/ExportModal.vue'

/** Смонтированное окно: нужно обработчику закрытия. */
let currentWrapper: VueWrapper | null = null
const AT = { x: 0, y: 0 }
/** Подпись-инъекция: закрывает комментарий и открывает script. */
const EVIL_LABEL = '--><script>alert(1)</script><!--'

/** Хранилище с двумя корнями («Дашборд» с ребёнком «Карточка» и «Подвал»); выделен ребёнок, если `select`. */
function prepareStore(select: boolean, rootLabel = 'Дашборд') {
  setActivePinia(createPinia())
  const store = useLayoutStore()
  store.addRoot('flex', rootLabel, AT, 800)
  store.addRoot('flex', 'Подвал', AT, 600)
  const rootId = store.document.roots[0]?.node.id ?? ''
  store.addChild(rootId, 'flex', 'Карточка')
  const root = store.document.roots[0]?.node
  const childId = root?.children[0]?.id ?? ''
  store.select(select ? childId : null)
  return store
}

/** Обёртка над body: окно телепортируется туда, поэтому искать надо в документе, а не в wrapper. */
function page(): DOMWrapper<HTMLElement> {
  return new DOMWrapper(document.body)
}

/** Закрытие окна (Esc, крестик): отражает v-model обратно в проп. */
function onUpdateOpen(value: boolean): void {
  void currentWrapper?.setProps({ open: value })
}

/** Монтирует открытое окно (Teleport уносит содержимое в body). */
function mountModal(open = true): VueWrapper {
  const wrapper = mount(ExportModal, {
    props: {
      open,
      'onUpdate:open': onUpdateOpen,
    },
    attachTo: document.body,
  })
  currentWrapper = wrapper
  return wrapper
}

/** Промис, который завершается вручную через `resolve()`. */
function deferredPromise(): { promise: Promise<void>; resolve: () => void } {
  let done: () => void = noop
  const promise = new Promise<void>((resolve) => {
    done = resolve
  })
  return {
    promise,
    /** Завершает промис. */
    resolve(): void {
      done()
    },
  }
}

/** Пустая функция. */
function noop(): void {}

/** Заменитель execCommand, у которого копирование не удалось. */
function failingExec(): boolean {
  return false
}

/** Текст предпросмотра кода. */
function previewText(): string {
  return page().get('.export-modal__code').text()
}

/** Кнопка в футере по тексту. */
function footerButton(text: string) {
  const button = page()
    .findAll('.ui-modal__footer button')
    .find((b) => b.text() === text)
  if (!button) throw new Error(`нет кнопки ${text}`)
  return button
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('ExportModal', () => {
  it('с выделением открывается на «Выделенный» и показывает контекст блока', () => {
    prepareStore(true)
    const wrapper = mountModal()
    expect(page().get('[aria-checked="true"]').text()).toBe('Выделенный')
    expect(previewText()).toContain('Фрагмент корневого блока')
    wrapper.unmount()
  })

  it('без выделения открывается на «Все», «Выделенный» недоступен', () => {
    prepareStore(false)
    const wrapper = mountModal()
    expect(page().get('[aria-checked="true"]').text()).toBe('Все')
    const selected = page()
      .findAll('[role="radio"]')
      .find((r) => r.text() === 'Выделенный')
    expect(selected?.attributes('disabled')).toBeDefined()
    expect(previewText()).toContain('корневых блоков 2')
    wrapper.unmount()
  })

  it('чекбоксы корней доступны только при «Отмеченные»; снятие отметки меняет предпросмотр', async () => {
    prepareStore(false)
    const wrapper = mountModal()
    /** Чекбоксы корней в списке. */
    const boxes = () => page().findAll('.ui-checkbox__input')
    expect(boxes()).toHaveLength(2)
    expect(boxes().every((b) => b.attributes('disabled') !== undefined)).toBe(true)
    await page()
      .findAll('[role="radio"]')
      .find((r) => r.text() === 'Отмеченные')
      ?.trigger('click')
    expect(boxes().every((b) => b.attributes('disabled') === undefined)).toBe(true)
    await boxes()[1]?.setValue(false)
    expect(previewText()).toContain('Дашборд')
    expect(previewText()).not.toContain('Подвал')
    await boxes()[0]?.setValue(false)
    expect(previewText()).toContain('Отметьте хотя бы один корневой блок')
    expect(footerButton('Копировать').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  it('«Копировать» ставит «Скопировано» на 2 с и не закрывает окно', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    prepareStore(true)
    const wrapper = mountModal()
    await footerButton('Копировать').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(String(writeText.mock.calls[0]?.[0])).toContain('Карточка')
    const copied = footerButton('Скопировано')
    expect(copied.classes()).toContain('ui-button--variant-success')
    expect(page().find('.ui-modal__dialog').exists()).toBe(true)
    vi.advanceTimersByTime(EXPORT_COPIED_MS)
    await flushPromises()
    expect(footerButton('Копировать').classes()).toContain('ui-button--variant-primary')
    wrapper.unmount()
  })

  it('если окно закрыли во время копирования, «Скопировано» не включается', async () => {
    const deferred = deferredPromise()
    const writeText = vi.fn().mockReturnValue(deferred.promise)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    prepareStore(true)
    const wrapper = mountModal()
    await footerButton('Копировать').trigger('click')
    await wrapper.setProps({ open: false })
    deferred.resolve()
    await flushPromises()
    await wrapper.setProps({ open: true })
    expect(footerButton('Копировать').classes()).toContain('ui-button--variant-primary')
    wrapper.unmount()
  })

  it('ошибка копирования показывает сообщение', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('нет')) } })
    Object.defineProperty(document, 'execCommand', { value: failingExec, configurable: true })
    prepareStore(true)
    const wrapper = mountModal()
    await footerButton('Копировать').trigger('click')
    await flushPromises()
    expect(page().get('.export-modal__error').text()).toContain('Не удалось скопировать')
    wrapper.unmount()
  })

  it('подпись-инъекция не создаёт script в предпросмотре', () => {
    prepareStore(false, EVIL_LABEL)
    const wrapper = mountModal()
    expect(previewText()).toContain('script')
    expect(page().find('script').exists()).toBe(false)
    expect(document.querySelector('script')).toBeNull()
    wrapper.unmount()
  })

  it('при открытии фокус на кнопке «Копировать»', async () => {
    prepareStore(true)
    const wrapper = mountModal(false)
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(document.activeElement).toBe(footerButton('Копировать').element)
    wrapper.unmount()
  })
})
