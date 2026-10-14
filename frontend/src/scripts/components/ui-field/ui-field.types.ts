/** Типы общего компонента UiField: пропсы поля с подписью и данные для привязки контрола. */

/** Пропсы поля: подпись над контролом, подсказка и текст ошибки под ним. */
export interface UiFieldProps {
  label: string
  hint?: string
  error?: string
}

/** Данные для контрола в слоте: id для связи label→control и aria-атрибуты. */
export interface UiFieldSlotProps {
  id: string
  labelId: string
  describedBy: string | undefined
  invalid: boolean
}
