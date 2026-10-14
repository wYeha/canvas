/** Типы общего компонента UiChips: пресет-чипы (быстрые значения: ширина превью, колонки сетки). */

import type { UiInputAttrs } from '@/scripts/components/ui-text-input/ui-text-input.types'

/** Чип: значение, подпись и признак недоступности. */
export interface UiChipOption {
  value: string
  label: string
  disabled?: boolean
}

/** Пропсы группы чипов: варианты, подпись группы для скринридера, недоступность всей группы. */
export interface UiChipsProps {
  options: readonly UiChipOption[]
  label: string
  disabled?: boolean
  /** Атрибуты группы (id, aria-describedby, aria-labelledby) — например, из слота UiField. */
  inputAttrs?: UiInputAttrs
}
