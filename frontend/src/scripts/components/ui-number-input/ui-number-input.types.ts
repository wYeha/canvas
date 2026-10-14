/** Типы общего компонента UiNumberInput: пропсы числового поля. */

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
  disabled?: boolean
}
