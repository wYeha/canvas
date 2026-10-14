/** Типы общего компонента UiTextarea: пропсы и события многострочного поля. */
import type { UiInputAttrs } from '@/scripts/components/ui-text-input/ui-text-input.types'

/** Пропсы поля: подпись для скринридера, подсказка, число строк по умолчанию и состояния. */
export interface UiTextareaProps {
  label: string
  placeholder?: string
  /** Видимое число строк; высоту можно потянуть вертикально. */
  rows?: number
  error?: boolean
  disabled?: boolean
  /** Атрибуты нативного поля (id, aria-describedby, aria-labelledby) — например, из слота UiField. */
  inputAttrs?: UiInputAttrs
}

/** События поля: клавиатура и потеря фокуса поднимаются наверх (значение идёт через v-model). */
export interface UiTextareaEmits {
  keydown: [event: KeyboardEvent]
  blur: [event: FocusEvent]
}
