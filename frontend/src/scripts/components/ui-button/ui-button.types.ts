/** Типы общего компонента UiButton: пропсы текстовой кнопки. */
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'
import type { UI_BUTTON_SIZES, UI_BUTTON_VARIANTS } from '@/scripts/components/ui-button/ui-button.constants'

/** Вид кнопки. */
export type UiButtonVariant = (typeof UI_BUTTON_VARIANTS)[number]

/** Размер кнопки. */
export type UiButtonSize = (typeof UI_BUTTON_SIZES)[number]

/** Тип нативной кнопки: обычная или отправка формы. */
export type UiButtonType = 'button' | 'submit'

/** Пропсы кнопки: вид, размер, тип, недоступность, иконка слева или справа и подсказка горячей клавиши. */
export interface UiButtonProps {
  type?: UiButtonType
  variant?: UiButtonVariant
  size?: UiButtonSize
  disabled?: boolean
  icon?: UiIconName
  iconAfter?: UiIconName
  /** Подсказка клавиши на кнопке (только отображение). */
  hint?: string
  /** Значение aria-keyshortcuts в формате спецификации: `Control+E`, `F`. */
  keyshortcuts?: string
}
