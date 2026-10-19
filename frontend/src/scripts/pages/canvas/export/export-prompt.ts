/** Шаблон промпта экспорта: текст по умолчанию, разбор сохранённого значения и вставка промпта перед кодом. */
import { formatComment } from './export-comment'
import { toCommentLines } from './export-escape'
import { EXPORT_NEWLINE } from './export-constants'

/** Текст шаблона промпта по умолчанию (docs/DESIGN.md, «Шаблон промпта по умолчанию»). */
export const DEFAULT_EXPORT_PROMPT =
  'Сверстай по этому каркасу. Структуру, вложенность, flex/grid-свойства и размеры не меняй. ' +
  'Комментарии описывают назначение блоков. Повторы ×N — это одинаковые элементы, оформи их компонентом. ' +
  'Блоки с пометкой «компонент «…»» — один и тот же компонент в разных местах: сделай его один раз и переиспользуй.'

/**
 * Промпт из сохранённого значения: строка (в том числе пустая — выбор «без промпта») берётся как есть,
 * всё остальное (нет ключа, чужой тип) заменяется умолчанием.
 */
export function resolvePrompt(stored: unknown): string {
  return typeof stored === 'string' ? stored : DEFAULT_EXPORT_PROMPT
}

/** Строки комментария промпта: одна строка — однострочный комментарий, несколько — многострочный. */
function promptCommentLines(prompt: string): string[] {
  const lines = toCommentLines(prompt)
  if (lines.length <= 1) return formatComment(lines[0] ?? '', [], '')
  return formatComment('', lines, '')
}

/**
 * Склеивает промпт и код: промпт — первым комментарием, затем пустая строка и код.
 * Пустой код → пустая строка (одного промпта не выводим); пустой промпт → только код.
 */
export function withPrompt(prompt: string, code: string): string {
  if (code === '') return ''
  const comment = promptCommentLines(prompt)
  if (comment.length === 0) return code
  return `${comment.join(EXPORT_NEWLINE)}${EXPORT_NEWLINE}${EXPORT_NEWLINE}${code}`
}
