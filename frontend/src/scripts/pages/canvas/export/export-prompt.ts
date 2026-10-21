/** Шаблон промпта экспорта: текст по умолчанию, разбор сохранённого значения и вставка промпта перед кодом. */
import { formatComment } from './export-comment'
import { toCommentLines } from './export-escape'
import { EXPORT_NEWLINE, EXPORT_RULES_TITLE } from './export-constants'

/** Текст шаблона промпта по умолчанию (docs/DESIGN.md, «Шаблон промпта по умолчанию»). */
export const DEFAULT_EXPORT_PROMPT =
  'Сверстай по этому каркасу. Структуру и вложенность не меняй; flex/grid-свойства, фиксированные размеры ' +
  'и растяжение сохраняй, адаптив добавляй только там, где он описан. Комментарии описывают назначение блоков. ' +
  'Элемент с ×N (data-repeat="N") повторяется целиком N раз подряд соседями — оформи его компонентом. ' +
  'Блоки с пометкой «компонент «…»» — один и тот же компонент в разных местах: его описание — в списке ' +
  '«Компоненты» в начале; сделай его один раз и переиспользуй.'

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

/** Текст промпта с правилами документа: правила — отдельным абзацем после шаблона; пустые части пропускаются. */
export function promptText(prompt: string, rules: string): string {
  const trimmedRules = rules.trim()
  if (trimmedRules === '') return prompt
  const rulesBlock = `${EXPORT_RULES_TITLE}${EXPORT_NEWLINE}${trimmedRules}`
  return prompt.trim() === '' ? rulesBlock : `${prompt}${EXPORT_NEWLINE}${EXPORT_NEWLINE}${rulesBlock}`
}

/**
 * Склеивает промпт и код: промпт (с правилами документа) — первым комментарием, затем пустая строка и код.
 * Пустой код → пустая строка (одного промпта не выводим); пустой промпт и правила → только код.
 */
export function withPrompt(prompt: string, code: string, rules = ''): string {
  if (code === '') return ''
  const comment = promptCommentLines(promptText(prompt, rules))
  if (comment.length === 0) return code
  return `${comment.join(EXPORT_NEWLINE)}${EXPORT_NEWLINE}${EXPORT_NEWLINE}${code}`
}
