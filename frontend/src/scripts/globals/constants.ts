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

/** Ключ localStorage для состояния синхронизации с сервером (JSON `{ synced: { id: updatedAt }, deleted: id[] }`). */
export const SYNC_STATE_STORAGE_KEY = 'layout-canvas:sync'

/** Ключ localStorage для настройки редактора «показывать подписи блоков на канвасе» (`'true'` / `'false'`; общая для всех документов). */
export const LABELS_VISIBLE_STORAGE_KEY = 'layout-canvas:labels-visible'

/** Строка localStorage для включённого флага. */
export const FLAG_TRUE = 'true'

/** Строка localStorage для выключенного флага. */
export const FLAG_FALSE = 'false'

/** Порог контраста WCAG AA для обычного текста. */
export const WCAG_AA_TEXT_RATIO = 4.5

/** Порог sRGB-канала (доля от 1), ниже которого перевод в линейный вид идёт делением (формула WCAG 2.x). */
export const SRGB_LINEAR_THRESHOLD = 0.04045

/** Делитель линейного участка перевода sRGB-канала (формула WCAG 2.x). */
export const SRGB_LINEAR_DIVISOR = 12.92

/** Смещение гамма-участка перевода sRGB-канала (формула WCAG 2.x). */
export const SRGB_GAMMA_OFFSET = 0.055

/** Делитель гамма-участка перевода sRGB-канала (формула WCAG 2.x). */
export const SRGB_GAMMA_DIVISOR = 1.055

/** Показатель степени гамма-участка перевода sRGB-канала (формула WCAG 2.x). */
export const SRGB_GAMMA_POWER = 2.4

/** Наибольшее значение канала sRGB. */
export const CHANNEL_MAX = 255

/** Веса красного, зелёного и синего каналов в относительной яркости (WCAG 2.x). */
export const LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722] as const

/** Добавка к яркости в формуле отношения контраста (WCAG 2.x). */
export const LUMINANCE_OFFSET = 0.05

/** Основание системы счисления hex-цвета. */
export const HEX_RADIX = 16

/** Длина полной hex-записи цвета без `#`: `rrggbb`. */
export const HEX_FULL_LENGTH = 6

/** Длина короткой hex-записи цвета без `#`: `rgb`. */
export const HEX_SHORT_LENGTH = 3

/** Префикс адресов API: в dev Vite проксирует его на бэкенд, на сервере — nginx. */
export const API_BASE = '/api'

/** Имена маршрутов приложения (vue-router). */
export const ROUTE_NAMES = {
  CANVAS: 'canvas',
  LOGIN: 'login',
  UI_KIT: 'ui-kit',
} as const

/** Адреса маршрутов приложения. */
export const ROUTE_PATHS = {
  CANVAS: '/',
  LOGIN: '/login',
  UI_KIT: '/ui-kit',
} as const

/** Параметр адреса страницы входа: куда вернуться после входа. */
export const LOGIN_REDIRECT_QUERY_PARAM = 'redirect'
