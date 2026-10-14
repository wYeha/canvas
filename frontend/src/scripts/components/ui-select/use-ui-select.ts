/** Логика компонента UiSelect: выбор значения поверх общего всплывающего списка (listbox-паттерн). */
import { computed, useId, type ComputedRef, type Ref } from 'vue'
import type { UiSelectProps } from '@/scripts/components/ui-select/ui-select.types'
import { firstEnabledIndex, lastEnabledIndex } from '@/scripts/globals/list-nav'
import { usePopupList, type PopupList } from '@/scripts/globals/use-popup-list'

/** Состояние селекта: общий всплывающий список плюс выбранное значение, id и обработчики. */
export interface UiSelectState extends Omit<PopupList, 'anchor'> {
  trigger: PopupList['anchor']
  activeId: ComputedRef<string | undefined>
  listId: string
  valueId: string
  ownLabelId: string
  hasExternalLabel: ComputedRef<boolean>
  labelledBy: ComputedRef<string>
  selectedIndex: ComputedRef<number>
  selectedLabel: ComputedRef<string>
  hasValue: ComputedRef<boolean>
  optionId: (index: number) => string
  choose: (index: number) => void
}

/** Возвращает состояние и обработчики селекта; ссылки root, trigger и list привязываются в шаблоне по имени. */
export function useUiSelect(props: Readonly<UiSelectProps>, model: Ref<string | null>): UiSelectState {
  const listId = ['ui-select', useId()].join('-')
  const selectedIndex = computed(() => props.options.findIndex((option) => option.value === model.value))

  /** Выбирает пункт (если он доступен), обновляет модель и закрывает список. */
  function choose(index: number): void {
    const option = props.options[index]
    if (!option || option.disabled) return
    model.value = option.value
    popup.close(true)
  }

  const popup = usePopupList({
    /** Варианты списка. */
    items: () => props.options,
    /** Недоступность открытия. */
    disabled: () => props.disabled === true,
    /** При открытии активен выбранный пункт, иначе первый доступный (при ↑ — последний). */
    initialIndex: (fromEnd) => {
      if (selectedIndex.value >= 0) return selectedIndex.value
      return fromEnd ? lastEnabledIndex(props.options) : firstEnabledIndex(props.options)
    },
    choose,
    matchWidth: true,
    wrap: false,
  })

  const selectedLabel = computed(() => props.options[selectedIndex.value]?.label ?? props.placeholder ?? '')
  const hasValue = computed(() => selectedIndex.value >= 0)
  const valueId = `${listId}-value`
  const ownLabelId = `${listId}-label`

  // Имя триггера = подпись + выбранное значение: подпись берётся у UiField (aria-labelledby) или из скрытого span
  const externalLabelId = computed(() => String(props.inputAttrs?.['aria-labelledby'] ?? ''))
  const hasExternalLabel = computed(() => externalLabelId.value !== '')
  const labelledBy = computed(() => `${hasExternalLabel.value ? externalLabelId.value : ownLabelId} ${valueId}`)

  /** Возвращает id пункта списка для aria-activedescendant. */
  function optionId(index: number): string {
    return `${listId}-option-${String(index)}`
  }

  const activeId = computed(() => (popup.activeIndex.value >= 0 ? optionId(popup.activeIndex.value) : undefined))

  const { anchor: trigger, ...rest } = popup
  return {
    ...rest,
    trigger,
    activeId,
    listId,
    valueId,
    ownLabelId,
    hasExternalLabel,
    labelledBy,
    selectedIndex,
    selectedLabel,
    hasValue,
    optionId,
    choose,
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
