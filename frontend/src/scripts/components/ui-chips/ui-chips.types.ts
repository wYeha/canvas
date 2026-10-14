/** Типы общего компонента UiChips: пресет-чипы (быстрые значения: ширина превью, колонки сетки). */

/** Чип: значение, подпись и признак недоступности. */
export interface UiChipOption {
  value: string
  label: string
  disabled?: boolean
}

/** Пропсы группы чипов: варианты, подпись группы для скринридера, недоступность всей группы. */
export interface UiChipsProps {
  options: readonly UiChipOption[]
  label: string
  disabled?: boolean
}
