/** Типы общего компонента UiIconButton: пропсы кнопки-иконки. */
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'
import type { UiButtonSize } from '@/scripts/components/ui-button/ui-button.types'

/** Пропсы кнопки-иконки: иконка, подпись для скринридера и подсказки, размер, недоступность. */
export interface UiIconButtonProps {
  icon: UiIconName
  label: string
  size?: UiButtonSize
  disabled?: boolean
}
