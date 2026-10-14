/** Константы общего компонента UiButton: допустимые виды и размеры (используются в витрине компонентов). */

/** Виды кнопки: danger — разрушительные действия («Удалить»), success — подтверждение результата («Скопировано»). */
export const UI_BUTTON_VARIANTS = ['default', 'ghost', 'primary', 'danger', 'success'] as const

/** Размеры кнопки: m — 28px (панель), l — 36px (тулбар). */
export const UI_BUTTON_SIZES = ['m', 'l'] as const
