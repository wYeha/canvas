/** Глобальные константы приложения. */

/** CSS-селектор контейнера в index.html, в который монтируется Vue-приложение. */
export const APP_MOUNT_SELECTOR = '#app'

/** Названия тем оформления; совпадают со значениями атрибута `data-theme` в `_globals.scss`. */
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const

/** Тема оформления: `'light'` или `'dark'`. */
export type Theme = (typeof THEMES)[keyof typeof THEMES]

/** Тема по умолчанию, если системная тёмная не выбрана. */
export const DEFAULT_THEME: Theme = THEMES.LIGHT

/** Атрибут корневого элемента, по которому `_globals.scss` выбирает набор CSS-переменных темы. */
export const THEME_ATTRIBUTE = 'data-theme'

/** Ключ localStorage для сохранённого выбора темы. */
export const THEME_STORAGE_KEY = 'layout-canvas:theme'

/** Медиазапрос системной тёмной темы. */
export const PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)'

/** Ключ localStorage для состояния сворачивания секций панели свойств (JSON `{ id секции: раскрыта }`). */
export const PROPS_SECTIONS_STORAGE_KEY = 'layout-canvas:props-sections'

/** Ключ localStorage для шаблона промпта экспорта (строка как есть; общий для всех документов). */
export const EXPORT_PROMPT_STORAGE_KEY = 'layout-canvas:export-prompt'

/** Ключ localStorage для индекса документов (JSON-массив `{ id, name, updatedAt, rootCount }`). */
export const DOCUMENTS_INDEX_STORAGE_KEY = 'layout-canvas:documents'

/** Префикс ключа localStorage документа; полный ключ — префикс + id документа. */
export const DOCUMENT_STORAGE_PREFIX = 'layout-canvas:document:'

/** Ключ localStorage для id текущего (открытого) документа. */
export const CURRENT_DOCUMENT_STORAGE_KEY = 'layout-canvas:current-document'
