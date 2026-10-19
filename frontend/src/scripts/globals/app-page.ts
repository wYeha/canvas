/** Выбор страницы по адресу: витрина компонентов открывается только в dev при `?ui`. */

/** Параметр адреса, включающий витрину компонентов (`?ui`). */
export const UI_KIT_QUERY_PARAM = 'ui'

/** Нужна ли витрина: только в dev-сборке и если в параметрах адреса есть `ui` (с любым значением). */
export function isUiKitRequested(isDev: boolean, query: Readonly<Record<string, unknown>>): boolean {
  return isDev && Object.hasOwn(query, UI_KIT_QUERY_PARAM)
}
