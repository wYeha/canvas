/** Типы общего компонента UiSelect: вариант списка и пропсы. */

/** Вариант списка: значение, подпись и признак недоступности. */
export interface UiSelectOption {
  value: string
  label: string
  disabled?: boolean
}

/** Пропсы селекта: варианты, подпись для скринридера, подсказка пустого значения и состояния. */
export interface UiSelectProps {
  options: readonly UiSelectOption[]
  label: string
  placeholder?: string
  error?: boolean
  disabled?: boolean
}
