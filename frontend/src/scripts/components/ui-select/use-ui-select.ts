/** Логика компонента UiSelect: выбор значения поверх общего всплывающего списка (listbox-паттерн). */
import { computed, useId, type ComputedRef, type Ref } from 'vue'
import type { UiSelectProps } from '@/scripts/components/ui-select/ui-select.types'
import { firstEnabledIndex } from '@/scripts/globals/list-nav'
import { usePopupList, type PopupList } from '@/scripts/globals/use-popup-list'

/** Клавиши, открывающие список на кнопке (Enter и Space открывают нативным click). */
const OPEN_KEYS = ['ArrowDown', 'ArrowUp']

/** Состояние селекта: общий всплывающий список плюс выбранное значение, id и обработчики. */
export interface UiSelectState extends Omit<PopupList, 'anchor'> {
  trigger: PopupList['anchor']
  activeId: ComputedRef<string | undefined>
  listId: string
  selectedIndex: ComputedRef<number>
  selectedLabel: ComputedRef<string>
  hasValue: ComputedRef<boolean>
  optionId: (index: number) => string
  choose: (index: number) => void
  onTriggerKeydown: (event: KeyboardEvent) => void
  onListKeydown: (event: KeyboardEvent) => void
}

/** Возвращает состояние и обработчики селекта; ссылки root, trigger и list привязываются в шаблоне по имени. */
export function useUiSelect(props: Readonly<UiSelectProps>, model: Ref<string | null>): UiSelectState {
  const selectedIndex = computed(() => props.options.findIndex((option) => option.value === model.value))
  const popup = usePopupList({
    /** Варианты списка. */
    items: () => props.options,
    /** Недоступность открытия. */
    disabled: () => props.disabled === true,
    /** При открытии активен выбранный пункт, иначе первый доступный. */
    initialIndex: () => (selectedIndex.value >= 0 ? selectedIndex.value : firstEnabledIndex(props.options)),
    matchWidth: true,
    wrap: false,
  })
  const listId = ['ui-select', useId()].join('-')
  const selectedLabel = computed(() => props.options[selectedIndex.value]?.label ?? props.placeholder ?? '')
  const hasValue = computed(() => selectedIndex.value >= 0)

  /** Возвращает id пункта списка для aria-activedescendant. */
  function optionId(index: number): string {
    return `${listId}-option-${String(index)}`
  }

  const activeId = computed(() => (popup.activeIndex.value >= 0 ? optionId(popup.activeIndex.value) : undefined))

  /** Выбирает пункт (если он доступен), обновляет модель и закрывает список. */
  function choose(index: number): void {
    const option = props.options[index]
    if (!option || option.disabled) return
    model.value = option.value
    popup.close(true)
  }

  /** Клавиатура на кнопке: стрелки открывают список. */
  function onTriggerKeydown(event: KeyboardEvent): void {
    if (!OPEN_KEYS.includes(event.key)) return
    event.preventDefault()
    popup.open()
  }

  /** Клавиатура в открытом списке: навигация, Enter/Space — выбрать, Esc — закрыть, Tab — закрыть и уйти дальше. */
  function onListKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(popup.activeIndex.value)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      popup.close(true)
    } else if (event.key === 'Tab') {
      popup.close(true)
    } else if (popup.navigate(event)) {
      event.preventDefault()
    }
  }

  const { anchor: trigger, ...rest } = popup
  return {
    ...rest,
    trigger,
    activeId,
    listId,
    selectedIndex,
    selectedLabel,
    hasValue,
    optionId,
    choose,
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
