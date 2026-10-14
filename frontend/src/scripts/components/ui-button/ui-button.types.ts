/** Типы общего компонента UiButton: пропсы текстовой кнопки. */
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'
import type { UI_BUTTON_SIZES, UI_BUTTON_VARIANTS } from '@/scripts/components/ui-button/ui-button.constants'

/** Вид кнопки. */
export type UiButtonVariant = (typeof UI_BUTTON_VARIANTS)[number]

/** Размер кнопки. */
export type UiButtonSize = (typeof UI_BUTTON_SIZES)[number]

/** Пропсы кнопки: вид, размер, недоступность, иконка слева или справа и подсказка горячей клавиши. */
export interface UiButtonProps {
  variant?: UiButtonVariant
  size?: UiButtonSize
  disabled?: boolean
  icon?: UiIconName
  iconAfter?: UiIconName
  hint?: string
}
