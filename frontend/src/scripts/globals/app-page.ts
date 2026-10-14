/** Выбор страницы приложения по адресу: редактор по умолчанию, витрина компонентов только в dev при `?ui`. */

/** Имена страниц приложения. */
export const APP_PAGES = {
  CANVAS: 'canvas',
  UI_KIT: 'ui-kit',
} as const

/** Имя страницы приложения. */
export type AppPageName = (typeof APP_PAGES)[keyof typeof APP_PAGES]

/** Параметр адреса, включающий витрину компонентов (`?ui`). */
export const UI_KIT_QUERY_PARAM = 'ui'

/** Возвращает имя страницы: витрина — только в dev-сборке и если в строке запроса есть `ui`. */
export function resolveAppPage(isDev: boolean, search: string): AppPageName {
  const hasUiParam = new URLSearchParams(search).has(UI_KIT_QUERY_PARAM)
  return isDev && hasUiParam ? APP_PAGES.UI_KIT : APP_PAGES.CANVAS
}
