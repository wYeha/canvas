/** Типы общего компонента UiToast: вид тоста, пропсы и события. */

/** Вид тоста: ошибка (role="alert") или обычное сообщение (role="status"). */
export type UiToastKind = 'error' | 'info'

/** Пропсы тоста: текст, вид и время автоскрытия в мс (0 — не скрывать само). */
export interface UiToastProps {
  message: string
  kind?: UiToastKind
  duration?: number
}

/** События тоста: запрос закрытия (кнопка или автоскрытие). */
export interface UiToastEmits {
  close: []
}
