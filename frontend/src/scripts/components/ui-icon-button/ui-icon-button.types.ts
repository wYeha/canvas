/** Типы общего компонента UiIconButton: пропсы кнопки-иконки. */
import type { UiIconName } from '@/scripts/components/ui-icon/ui-icon.types'
import type { UiButtonSize } from '@/scripts/components/ui-button/ui-button.types'

/** Пропсы кнопки-иконки: иконка, подпись для скринридера и подсказки, размер, недоступность, нажатость (для переключателей: aria-pressed). */
export interface UiIconButtonProps {
  icon: UiIconName
  label: string
  /** Текст всплывающей подсказки (`title`); по умолчанию равен `label`. Нужен переключателям: имя постоянное, подсказка — о действии. */
  tooltip?: string
  size?: UiButtonSize
  disabled?: boolean
  /** Состояние переключателя; `undefined` — обычная кнопка без aria-pressed. */
  pressed?: boolean
}
