/** Логика компонента UiSelect: открытие списка, активный пункт, клавиатура (listbox-паттерн), позиция и закрытие. */
import { computed, nextTick, ref, useId, type ComputedRef, type Ref } from 'vue'
import { popupStyle } from '@/scripts/components/ui-select/select-popup'
import type { UiSelectProps } from '@/scripts/components/ui-select/ui-select.types'
import { usePopupDismiss } from '@/scripts/components/ui-select/use-popup-dismiss'
import { findEnabledIndex, firstEnabledIndex, lastEnabledIndex, typeaheadIndex } from '@/scripts/globals/list-nav'

/** Клавиши, открывающие список на кнопке (Enter и Space открывают нативным click). */
const OPEN_KEYS = ['ArrowDown', 'ArrowUp']

/** Прокручивает список так, чтобы пункт был виден целиком (без scrollIntoView). */
function revealOption(list: HTMLElement, option: HTMLElement): void {
  if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop
  const bottom = option.offsetTop + option.offsetHeight
  if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
}

/** Возвращает состояние и обработчики селекта; ссылки root, trigger и list привязываются в шаблоне по имени. */
export function useUiSelect(props: Readonly<UiSelectProps>, model: Ref<string | null>) {
  const root = ref<HTMLElement | null>(null)
  const trigger = ref<HTMLButtonElement | null>(null)
  const list = ref<HTMLElement | null>(null)
  const isOpen = ref(false)
  const activeIndex = ref(-1)
  const listStyle = ref<Record<string, string>>({})
  const listId = ['ui-select', useId()].join('-')

  const selectedIndex = computed(() => props.options.findIndex((option) => option.value === model.value))
  const selectedLabel = computed(() => props.options[selectedIndex.value]?.label ?? props.placeholder ?? '')
  const hasValue = computed(() => selectedIndex.value >= 0)
  const activeId = computed(() => (activeIndex.value >= 0 ? optionId(activeIndex.value) : undefined))

  /** Возвращает id пункта списка для aria-activedescendant. */
  function optionId(index: number): string {
    return `${listId}-option-${String(index)}`
  }

  /** Делает пункт активным и прокручивает список к нему. */
  function setActive(index: number): void {
    if (index < 0) return
    activeIndex.value = index
    void nextTick(() => {
      const option = list.value?.children[index]
      if (list.value && option instanceof HTMLElement) revealOption(list.value, option)
    })
  }

  /** Открывает список: считает позицию, активирует выбранный (или первый доступный) пункт и переносит фокус на список. */
  function open(): void {
    if (props.disabled || !trigger.value) return
    listStyle.value = popupStyle(trigger.value.getBoundingClientRect(), window.innerHeight)
    isOpen.value = true
    setActive(selectedIndex.value >= 0 ? selectedIndex.value : firstEnabledIndex(props.options))
    void nextTick(() => list.value?.focus())
  }

  /** Закрывает список; refocus возвращает фокус на кнопку (не нужен при клике мимо). */
  function close(refocus: boolean): void {
    if (!isOpen.value) return
    isOpen.value = false
    activeIndex.value = -1
    if (refocus) trigger.value?.focus()
  }

  /** Выбирает пункт (если он доступен), обновляет модель и закрывает список. */
  function choose(index: number): void {
    const option = props.options[index]
    if (!option || option.disabled) return
    model.value = option.value
    close(true)
  }

  /** Переключает список по клику на кнопку (в том числе по Enter и Space с клавиатуры). */
  function toggle(): void {
    if (isOpen.value) close(true)
    else open()
  }

  /** Клавиатура на кнопке: стрелки открывают список. */
  function onTriggerKeydown(event: KeyboardEvent): void {
    if (!OPEN_KEYS.includes(event.key)) return
    event.preventDefault()
    open()
  }

  /** Перемещение по списку: стрелки, Home/End и поиск по первой букве; true, если клавиша обработана. */
  function navigate(event: KeyboardEvent): boolean {
    const current = activeIndex.value
    if (event.key === 'ArrowDown') setActive(findEnabledIndex(props.options, current, 1, false))
    else if (event.key === 'ArrowUp') setActive(findEnabledIndex(props.options, current, -1, false))
    else if (event.key === 'Home') setActive(firstEnabledIndex(props.options))
    else if (event.key === 'End') setActive(lastEnabledIndex(props.options))
    else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey)
      setActive(typeaheadIndex(props.options, current, event.key))
    else return false
    return true
  }

  /** Клавиатура в открытом списке: навигация, Enter/Space — выбрать, Esc — закрыть, Tab — закрыть и уйти дальше. */
  function onListKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(activeIndex.value)
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
    trigger,
    list,
    isOpen,
    activeIndex,
    activeId,
    listId,
    listStyle,
    selectedIndex,
    selectedLabel,
    hasValue,
    optionId,
    setActive,
    choose,
    toggle,
    onTriggerKeydown,
    onListKeydown,
  }
}

/** Классы корня селекта: блок и модификаторы открытия, ошибки и недоступности. */
export function useUiSelectClasses(
  props: Pick<UiSelectProps, 'error' | 'disabled'>,
  isOpen: Ref<boolean>,
): { classes: ComputedRef<(string | false | undefined)[]> } {
  const classes = computed(() => [
    'ui-select',
    isOpen.value && 'ui-select--open',
    props.error && 'ui-select--error',
    props.disabled && 'ui-select--disabled',
  ])
  return { classes }
}
