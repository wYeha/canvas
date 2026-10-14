/** Типы общего компонента UiSwitch: пропсы переключателя «вкл/выкл». */

import type { UiInputAttrs } from '@/scripts/components/ui-text-input/ui-text-input.types'

/** Пропсы переключателя: подпись для скринридера и недоступность. */
export interface UiSwitchProps {
  label: string
  disabled?: boolean
  /** Атрибуты кнопки (id, aria-describedby, aria-labelledby) — например, из слота UiField. */
  inputAttrs?: UiInputAttrs
}
