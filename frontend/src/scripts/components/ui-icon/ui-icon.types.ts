/** Типы общего компонента UiIcon: имя иконки и пропсы. */
import type { ICON_PATHS } from '@/scripts/components/ui-icon/ui-icon.constants'

/** Имя иконки из набора ICON_PATHS. */
export type UiIconName = keyof typeof ICON_PATHS

/** Пропсы иконки. */
export interface UiIconProps {
  name: UiIconName
}
