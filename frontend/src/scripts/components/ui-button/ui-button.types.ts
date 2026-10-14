/** Типы общего компонента UiButton: пропсы текстовой кнопки. */
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'

/** Пропсы кнопки: вид, размер, иконка слева или справа и подсказка горячей клавиши. */
export interface UiButtonProps {
  variant?: 'default' | 'ghost' | 'primary'
  size?: 'm' | 'l'
  icon?: UiIconName
  iconAfter?: UiIconName
  hint?: string
}
