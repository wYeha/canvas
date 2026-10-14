/** Типы общего компонента UiSelect: вариант списка и пропсы. */

import type { UiInputAttrs } from '@/scripts/components/ui-text-input/ui-text-input.types'

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
  /** Атрибуты кнопки-триггера (id, aria-describedby, aria-labelledby) — например, из слота UiField. */
  inputAttrs?: UiInputAttrs
}
