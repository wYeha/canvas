/** Общая логика всплывающих списков с клавиатурой (селект, меню): открытие, активный пункт, позиция, навигация, закрытие. */
import { nextTick, ref, type Ref } from 'vue'
import {
  findEnabledIndex,
  firstEnabledIndex,
  lastEnabledIndex,
  typeaheadIndex,
  type LabeledNavItem,
} from '@/scripts/globals/list-nav'
import { popupStyle } from '@/scripts/globals/popup'
import { usePopupDismiss } from '@/scripts/globals/use-popup-dismiss'

/** Клавиши, открывающие список с кнопки (Enter и Space открывают нативным click). */
const OPEN_KEYS = ['ArrowDown', 'ArrowUp']

/** Селектор элементов, которым можно вернуть фокус после закрытия списка. */
const FOCUSABLE_SELECTOR = 'button, [href], input, [tabindex]'

/** Параметры списка: геттеры, чтобы всегда читать актуальные пропсы компонента. */
export interface PopupListOptions {
  items: () => readonly LabeledNavItem[]
  disabled: () => boolean
  /** Индекс пункта, активного при открытии (-1, если подходящего нет); fromEnd — открыто стрелкой вверх. */
  initialIndex: (fromEnd: boolean) => number
  /** Выбор пункта по индексу (Enter/Space в списке): компонент сам решает, что делать со значением. */
  choose: (index: number) => void
  /** true — список той же ширины, что кнопка (селект); false — ширину задаёт CSS (меню). */
  matchWidth: boolean
  /** true — стрелки идут по кругу (меню), false — упираются в край (селект). */
  wrap: boolean
}

/** Состояние и действия всплывающего списка; ссылки root, anchor и list привязываются в шаблоне. */
export interface PopupList {
  root: Ref<HTMLElement | null>
  anchor: Ref<HTMLElement | null>
  list: Ref<HTMLElement | null>
  isOpen: Ref<boolean>
  activeIndex: Ref<number>
  listStyle: Ref<Record<string, string>>
  setActive: (index: number) => void
  open: (fromEnd?: boolean) => void
  close: (refocus: boolean) => void
  toggle: () => void
  navigate: (event: KeyboardEvent) => boolean
  onTriggerKeydown: (event: KeyboardEvent) => void
  onListKeydown: (event: KeyboardEvent) => void
}

/** Прокручивает список так, чтобы пункт был виден целиком (без scrollIntoView). */
function revealOption(list: HTMLElement, option: HTMLElement): void {
  if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
  const bottom = option.offsetTop + option.offsetHeight
  if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
}

/** Возвращает фокус на кнопку-якорь (или на первый фокусируемый элемент внутри обёртки). */
function focusAnchor(anchor: HTMLElement | null): void {
  const target = anchor?.matches(FOCUSABLE_SELECTOR) ? anchor : anchor?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
  target?.focus()
}

/** Создаёт состояние всплывающего списка: позиция fixed под якорем, фокус в списке, закрытие по клику мимо. */
export function usePopupList(options: PopupListOptions): PopupList {
  const root = ref<HTMLElement | null>(null)
  const anchor = ref<HTMLElement | null>(null)
  const list = ref<HTMLElement | null>(null)
  const isOpen = ref(false)
  const activeIndex = ref(-1)
  const listStyle = ref<Record<string, string>>({})

  /** Делает пункт активным и прокручивает список к нему. */
  function setActive(index: number): void {
    if (index < 0) return
    activeIndex.value = index
    void nextTick(() => {
      const option = list.value?.children[index]
      if (list.value && option instanceof HTMLElement) revealOption(list.value, option)
    })
  }

  /** Открывает список: считает позицию, активирует начальный пункт и переносит фокус на список. */
  function open(fromEnd = false): void {
    if (options.disabled() || !anchor.value) return
    const viewport = { width: window.innerWidth, height: window.innerHeight }
    listStyle.value = popupStyle(anchor.value.getBoundingClientRect(), viewport, options.matchWidth)
    isOpen.value = true
    setActive(options.initialIndex(fromEnd))
    void nextTick(() => list.value?.focus())
  }

  /** Закрывает список; refocus возвращает фокус на якорь (не нужен при клике мимо). */
  function close(refocus: boolean): void {
    if (!isOpen.value) return
    isOpen.value = false
    activeIndex.value = -1
    if (refocus) focusAnchor(anchor.value)
  }

  /** Переключает список. */
  function toggle(): void {
    if (isOpen.value) close(true)
    else open()
  }

  /** Перемещение по списку: стрелки, Home/End и поиск по первой букве; true, если клавиша обработана. */
  function navigate(event: KeyboardEvent): boolean {
    const items = options.items()
    const current = activeIndex.value
    if (event.key === 'ArrowDown') setActive(findEnabledIndex(items, current, 1, options.wrap))
    else if (event.key === 'ArrowUp') setActive(findEnabledIndex(items, current, -1, options.wrap))
    else if (event.key === 'Home') setActive(firstEnabledIndex(items))
    else if (event.key === 'End') setActive(lastEnabledIndex(items))
    else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey)
      setActive(typeaheadIndex(items, current, event.key))
    else return false
    return true
  }

  /** Клавиатура на кнопке: ↓ открывает с первого/выбранного пункта, ↑ — с последнего (APG). */
  function onTriggerKeydown(event: KeyboardEvent): void {
    if (!OPEN_KEYS.includes(event.key)) return
    event.preventDefault()
    open(event.key === 'ArrowUp')
  }

  /** Клавиатура в открытом списке: навигация, Enter/Space — выбрать, Esc — закрыть, Tab — закрыть и уйти дальше. */
  function onListKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      options.choose(activeIndex.value)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close(true)
    } else if (event.key === 'Tab') {
      close(true)
    } else if (navigate(event)) {
      event.preventDefault()
    }
  }

  usePopupDismiss(root, isOpen, close)

  return {
    root,
    anchor,
    list,
    isOpen,
    activeIndex,
    listStyle,
    setActive,
    open,
    close,
    toggle,
    navigate,
    onTriggerKeydown,
    onListKeydown,
  }
}
