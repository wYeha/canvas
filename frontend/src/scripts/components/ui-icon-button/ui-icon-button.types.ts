/** Типы общего компонента UiIconButton: пропсы кнопки-иконки. */
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'

/** Пропсы кнопки-иконки: иконка, подпись для скринридера и подсказки, размер. */
export interface UiIconButtonProps {
  icon: UiIconName
  label: string
  size?: 'm' | 'l'
}
