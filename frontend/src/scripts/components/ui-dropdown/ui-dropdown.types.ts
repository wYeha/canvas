/** Типы общего компонента UiDropdown: пункт меню, пропсы, события и данные для кнопки-триггера. */

/** Пункт меню: значение (уходит в событие select), подпись, недоступность и пометка разрушительного действия. */
export interface UiDropdownItem {
  value: string
  label: string
  disabled?: boolean
  danger?: boolean
}

/** Пропсы меню: пункты, подпись для скринридера, недоступность открытия. */
export interface UiDropdownProps {
  items: readonly UiDropdownItem[]
  label: string
  disabled?: boolean
}

/** События меню: выбран пункт (значение). */
export interface UiDropdownEmits {
  select: [value: string]
}

/** ARIA-атрибуты, которые кнопка-триггер получает из слота и вешает через v-bind. */
export interface UiDropdownTriggerAttrs {
  'aria-haspopup': 'menu'
  'aria-expanded': boolean
  'aria-controls': string | undefined
}
