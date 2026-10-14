/**
 * Подсветка кода экспорта без библиотек: вывод — узкая грамматика (комментарии, теги, атрибут style, строки),
 * поэтому хватает линейного прохода. Результат — строки токенов; склейка токенов даёт исходный текст.
 */
import { EXPORT_COMMENT_CLOSE, EXPORT_COMMENT_OPEN, EXPORT_NEWLINE } from './export-constants'
import type { HighlightLine, HighlightTarget, HighlightToken } from './export-types'

/** Начало тега: `<div`, `</div`, `<!DOCTYPE`. */
const TAG_START = /^<\/?[A-Za-z!][\w-]*/
/** Конец тега: `>` или `/>`. */
const TAG_END = /^\/?>/
/** Имя атрибута внутри тега. */
const ATTR_NAME = /^[^\s=>"/]+/
/** Пробелы внутри тега. */
const SPACES = /^\s+/
/** Двойная кавычка: границы значения атрибута. */
const QUOTE = '"'
/** Знак присваивания атрибута. */
const EQUALS = '='

/** Возвращает совпадение шаблона (привязан к началу) в `rest`; `null`, если не совпало. */
function matchAt(rest: string, pattern: RegExp): string | null {
  return pattern.exec(rest)?.[0] ?? null
}

/** Читает комментарий от `pos` до `-->` включительно (незакрытый — до конца текста). */
function readComment(text: string, pos: number): string {
  const close = text.indexOf(EXPORT_COMMENT_CLOSE, pos + EXPORT_COMMENT_OPEN.length)
  return text.slice(pos, close < 0 ? text.length : close + EXPORT_COMMENT_CLOSE.length)
}

/** Читает строку в двойных кавычках от `pos` (незакрытая — до конца текста). */
function readString(text: string, pos: number): string {
  const close = text.indexOf(QUOTE, pos + 1)
  return text.slice(pos, close < 0 ? text.length : close + 1)
}

/** Читает один токен внутри тега (после его имени): пробелы, `=`, строка, имя атрибута или конец тега. */
function readInsideTag(text: string, pos: number): { token: HighlightToken; closes: boolean } {
  const rest = text.slice(pos)
  const end = matchAt(rest, TAG_END)
  if (end !== null) return { token: { kind: 'tag', text: end }, closes: true }
  const spaces = matchAt(rest, SPACES)
  if (spaces !== null) return { token: { kind: 'text', text: spaces }, closes: false }
  if (rest.startsWith(EQUALS)) return { token: { kind: 'punct', text: EQUALS }, closes: false }
  if (rest.startsWith(QUOTE)) return { token: { kind: 'string', text: readString(text, pos) }, closes: false }
  const name = matchAt(rest, ATTR_NAME) ?? (rest[0] as string)
  return { token: { kind: 'attr', text: name }, closes: false }
}

/** Разбивает весь текст на плоский список токенов (переводы строк остаются внутри токенов). */
function tokenize(text: string): HighlightToken[] {
  const tokens: HighlightToken[] = []
  let pos = 0
  let insideTag = false
  while (pos < text.length) {
    let token: HighlightToken
    if (insideTag) {
      const read = readInsideTag(text, pos)
      token = read.token
      insideTag = !read.closes
    } else if (text.startsWith(EXPORT_COMMENT_OPEN, pos)) {
      token = { kind: 'comment', text: readComment(text, pos) }
    } else {
      const start = matchAt(text.slice(pos), TAG_START)
      if (start === null) {
        const next = text.indexOf('<', pos + 1)
        token = { kind: 'text', text: text.slice(pos, next < 0 ? text.length : next) }
      } else {
        token = { kind: 'tag', text: start }
        insideTag = true
      }
    }
    tokens.push(token)
    pos += token.text.length
  }
  return tokens
}

/** Раскладывает плоские токены по строкам: токен с переводами строк режется, состояние (комментарий) переходит дальше. */
function splitIntoLines(tokens: readonly HighlightToken[]): HighlightLine[] {
  const lines: HighlightLine[] = [{ number: 1, tokens: [] }]
  for (const token of tokens) {
    token.text.split(EXPORT_NEWLINE).forEach((part, i) => {
      if (i > 0) lines.push({ number: lines.length + 1, tokens: [] })
      if (part !== '') lines[lines.length - 1]?.tokens.push({ kind: token.kind, text: part })
    })
  }
  const last = lines[lines.length - 1]
  // Завершающий перевод строки не создаёт лишнюю пустую строку
  if (lines.length > 1 && last?.tokens.length === 0) lines.pop()
  return lines
}

/** Подсвечивает текст по строкам: `code` — токены грамматики экспорта, `prompt` — всё одним видом `prompt`. Пустой текст → нет строк. */
export function highlightCode(text: string, target: HighlightTarget): HighlightLine[] {
  if (text === '') return []
  const tokens: HighlightToken[] = target === 'prompt' ? [{ kind: 'prompt', text }] : tokenize(text)
  return splitIntoLines(tokens)
}
