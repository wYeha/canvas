/** Чистая логика настроек редактора, которые хранятся в localStorage: разбор и запись флагов «показывать подписи» и «зеркало связей». Без Vue. */
import { FLAG_FALSE, FLAG_TRUE } from '@/scripts/globals/constants'

/** Разбирает сохранённый флаг подписей: подписи скрыты только при явном `'false'`, любой другой мусор или отсутствие — показаны. */
export function parseLabelsVisible(raw: string | null): boolean {
  return raw !== FLAG_FALSE
}

/** Строка для записи флага настройки (подписи, зеркало) в хранилище. */
export function serializeFlag(visible: boolean): string {
  return visible ? FLAG_TRUE : FLAG_FALSE
}

/** Разбирает сохранённый флаг зеркала связей: включено только при явном `'true'`, по умолчанию — плашки. */
export function parseLinksMirrored(raw: string | null): boolean {
  return raw === FLAG_TRUE
}
