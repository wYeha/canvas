/** Типы общего компонента UiNumberInput: пропсы числового поля. */

import type { UiInputAttrs } from '@/scripts/components/ui-text-input/ui-text-input.types'

/** Единица, показываемая справа от числа (только отображение, в значение не входит). */
export type UiNumberUnit = 'px' | '%' | 'fr'

/** Пропсы числового поля: подпись, границы, шаг, единица, префикс и состояния. */
export interface UiNumberInputProps {
  label: string
  min?: number
  max?: number
  step?: number
  unit?: UiNumberUnit
  prefix?: string
  placeholder?: string
  error?: boolean
  /** Можно ли очистить поле (пусто = null); по умолчанию да. При false пустой ввод откатывается к прошлому значению. */
  nullable?: boolean
  disabled?: boolean
  /** Атрибуты нативного поля (id, aria-describedby, aria-labelledby) — например, из слота UiField. */
  inputAttrs?: UiInputAttrs
}
