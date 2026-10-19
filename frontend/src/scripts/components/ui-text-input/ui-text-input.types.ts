/** Типы общего компонента UiTextInput: пропсы и события однострочного поля. */

/** Дополнительные атрибуты нативного input (role, inputmode, aria-*). */
export type UiInputAttrs = Record<string, string | number | undefined>

/** Тип нативного поля: обычный текст или пароль (символы скрыты). */
export type UiTextInputType = 'text' | 'password'

/** Пропсы поля: подпись для скринридера, подсказка, префикс слева, суффикс справа, тип, состояния. */
export interface UiTextInputProps {
  label: string
  type?: UiTextInputType
  placeholder?: string
  prefix?: string
  suffix?: string
  error?: boolean
  disabled?: boolean
  mono?: boolean
  inputAttrs?: UiInputAttrs
}

/** События поля: клавиатура и потеря фокуса поднимаются наверх (значение идёт через v-model). */
export interface UiTextInputEmits {
  keydown: [event: KeyboardEvent]
  blur: [event: FocusEvent]
}
