/** Чистая логика настроек редактора, которые хранятся в localStorage: разбор и запись флага «показывать подписи». Без Vue. */

/** Строка хранилища для включённого флага. */
export const FLAG_TRUE = 'true'

/** Строка хранилища для выключенного флага. */
export const FLAG_FALSE = 'false'

/** Разбирает сохранённый флаг подписей: подписи скрыты только при явном `'false'`, любой другой мусор или отсутствие — показаны. */
export function parseLabelsVisible(raw: string | null): boolean {
  return raw !== FLAG_FALSE
}

/** Строка для записи флага подписей в хранилище. */
export function serializeLabelsVisible(visible: boolean): string {
  return visible ? FLAG_TRUE : FLAG_FALSE
}
