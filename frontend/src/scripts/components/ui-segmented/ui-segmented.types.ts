/** Типы общего компонента UiSegmented: вариант сегмента и пропсы переключателя. */
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'

/** Вариант сегмента: подпись обязательна (для иконочных она уходит в aria-label и title). */
export interface UiSegmentedOption {
  value: string
  label: string
  icon?: UiIconName
  /** Показывать только иконку или слот; по умолчанию true, если задана иконка. */
  iconOnly?: boolean
  disabled?: boolean
}

/** Пропсы переключателя: варианты, подпись группы для скринридера, недоступность всей группы. */
export interface UiSegmentedProps {
  options: readonly UiSegmentedOption[]
  label: string
  disabled?: boolean
}
