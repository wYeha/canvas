/** Типы общего компонента UiModal: размер и пропсы модального окна. */

/** Размер окна: export — 1040×700 (экспорт), compact — узкое окно по высоте содержимого (подтверждения). */
export type UiModalSize = 'export' | 'compact'

/** Пропсы модалки: заголовок, размер и элемент, который получает фокус при открытии (иначе первый фокусируемый). */
export interface UiModalProps {
  title: string
  size?: UiModalSize
  initialFocus?: HTMLElement | null
}
