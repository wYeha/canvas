/** Разбор документа из внешних данных (импорт .json, localStorage, API) с понятным русским сообщением об ошибке. */
import { z } from 'zod'
import { layoutDocumentSchema, type LayoutDocument } from './document'

/** Результат разбора: документ или текст ошибки для пользователя. */
export type ParseDocumentResult = { ok: true; document: LayoutDocument } | { ok: false; error: string }

/** Русские сообщения zod; передаются в каждый разбор, чтобы не менять глобальную конфигурацию zod. */
const RU_LOCALE = z.locales.ru()

/** Собирает путь вида `roots[0].node.children[2].label` из пути zod-ошибки. */
function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((acc, key) => {
    if (typeof key === 'number') return `${acc}[${String(key)}]`
    const name = String(key)
    return acc === '' ? name : `${acc}.${name}`
  }, '')
}

/** Проверяет данные схемой документа; при ошибке возвращает сообщение о первой найденной проблеме. */
export function parseDocument(data: unknown): ParseDocumentResult {
  const result = layoutDocumentSchema.safeParse(data, { error: RU_LOCALE.localeError })
  if (result.success) return { ok: true, document: result.data }
  const [issue] = result.error.issues
  if (!issue) return { ok: false, error: 'Файл не похож на документ Layout Canvas' }
  const path = formatPath(issue.path)
  const where = path === '' ? '' : ` (поле ${path})`
  return { ok: false, error: `Документ повреждён${where}: ${issue.message}` }
}
