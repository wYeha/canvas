/** Экранирование пользовательских строк для экспорта: атрибут `style`, текст комментариев, однострочные подписи и строки описания. */
import {
  EXPORT_ATTR_ESCAPES,
  EXPORT_COMMENT_ESCAPES,
  EXPORT_CONTROL_ALL,
  EXPORT_CONTROL_EXCEPT_NEWLINE,
  EXPORT_CONTROL_REPLACEMENT,
  EXPORT_DOUBLE_HYPHEN,
  EXPORT_HYPHEN_SPLIT,
  EXPORT_LINE_BREAK,
  EXPORT_WORD_SEPARATOR,
} from './export-constants'

/** Применяет замены по порядку. */
function applyEscapes(value: string, escapes: readonly (readonly [RegExp, string])[]): string {
  return escapes.reduce((result, [pattern, replacement]) => result.replace(pattern, replacement), value)
}

/** Экранирует строку для значения HTML-атрибута в двойных кавычках (`&` первым, чтобы не задвоить). */
export function escapeHtmlAttr(value: string): string {
  return applyEscapes(value, EXPORT_ATTR_ESCAPES)
}

/**
 * Делает текст безопасным внутри `<!-- … -->`: управляющие и bidi-символы (кроме `\n`) → пробел,
 * `&` и `<` → сущности, два дефиса подряд разбиваются пробелом (`---` → `- - -`).
 * Этого хватает против `-->`, `<!--` и `--!>`; `>` не трогаем ради читаемости («a > b»).
 */
export function escapeCommentText(value: string): string {
  const visible = value.replace(EXPORT_CONTROL_EXCEPT_NEWLINE, EXPORT_CONTROL_REPLACEMENT)
  return applyEscapes(visible, EXPORT_COMMENT_ESCAPES).replace(EXPORT_DOUBLE_HYPHEN, EXPORT_HYPHEN_SPLIT)
}

/** Однострочная подпись: переводы строк и управляющие символы → пробел, пробелы схлопнуты, края обрезаны. */
export function toSingleLine(value: string): string {
  return value.replace(EXPORT_CONTROL_ALL, EXPORT_CONTROL_REPLACEMENT).replace(/\s+/g, EXPORT_WORD_SEPARATOR).trim()
}

/** Строки многострочного описания: управляющие символы → пробел, хвостовые пробелы срезаны, крайние пустые строки отброшены. */
export function toCommentLines(value: string): string[] {
  const lines = value
    .split(EXPORT_LINE_BREAK)
    .map((line) => line.replace(EXPORT_CONTROL_ALL, EXPORT_CONTROL_REPLACEMENT).trimEnd())
  let start = 0
  let end = lines.length
  while (start < end && lines[start] === '') start += 1
  while (end > start && lines[end - 1] === '') end -= 1
  return lines.slice(start, end)
}
