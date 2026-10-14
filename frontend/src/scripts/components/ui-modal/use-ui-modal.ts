/** Логика компонента UiModal: фокус при открытии и возврат инициатору, фокус-ловушка, Esc, блокировка прокрутки. */
import { computed, nextTick, onBeforeUnmount, ref, useId, watch, type ComputedRef, type Ref } from 'vue'
import type { UiModalProps } from '@/scripts/components/ui-modal/ui-modal.types'
import { getTabbable, nextFocusIndex } from '@/scripts/globals/focus-trap'
import { getPageScrollLock } from '@/scripts/globals/scroll-lock'

/** Состояние и обработчики модалки; ссылка dialog привязывается в шаблоне по имени. */
export interface UiModalState {
  dialog: Ref<HTMLElement | null>
  titleId: string
  dialogClasses: ComputedRef<string[]>
  close: () => void
  onKeydown: (event: KeyboardEvent) => void
}

/** Создаёт логику модалки поверх v-model:open (true — окно показано). */
export function useUiModal(props: Readonly<UiModalProps>, open: Ref<boolean>): UiModalState {
  const dialog = ref<HTMLElement | null>(null)
  const titleId = ['ui-modal', useId(), 'title'].join('-')
  let opener: HTMLElement | null = null
  let locked = false

  const dialogClasses = computed(() => ['ui-modal__dialog', `ui-modal__dialog--size-${props.size ?? 'export'}`])

  /** Закрывает окно. */
  function close(): void {
    open.value = false
  }

  /** Переводит фокус внутрь окна: на переданный элемент, иначе на первый фокусируемый, иначе на само окно. */
  function focusInside(): void {
    const target = props.initialFocus ?? (dialog.value ? getTabbable(dialog.value)[0] : undefined) ?? dialog.value
    target?.focus()
  }

  /** При открытии запоминает инициатора, блокирует прокрутку и забирает фокус; при закрытии всё возвращает. */
  function sync(isOpen: boolean): void {
    if (isOpen && !locked) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
      getPageScrollLock().lock()
      locked = true
      void nextTick(focusInside)
    } else if (!isOpen && locked) {
      release()
    }
  }

  /** Снимает блокировку прокрутки и возвращает фокус элементу-инициатору. */
  function release(): void {
    getPageScrollLock().unlock()
    locked = false
    opener?.focus()
    opener = null
  }

  /** Фокус-ловушка: Tab и Shift+Tab ходят по кругу внутри окна. */
  function trapTab(event: KeyboardEvent): void {
    if (!dialog.value) return
    const items = getTabbable(dialog.value)
    const index = nextFocusIndex(items.length, items.indexOf(document.activeElement as HTMLElement), event.shiftKey)
    event.preventDefault()
    ;(items[index] ?? dialog.value).focus()
  }

  /** Клавиатура внутри окна: Esc закрывает, Tab держит фокус внутри. */
  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation()
      close()
    } else if (event.key === 'Tab') {
      trapTab(event)
    }
  }

  watch(open, sync, { immediate: true })
  onBeforeUnmount(() => {
    if (locked) release()
  })

  return { dialog, titleId, dialogClasses, close, onKeydown }
}
