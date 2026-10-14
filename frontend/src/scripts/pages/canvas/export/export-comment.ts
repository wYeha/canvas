/** Комментарии экспорта: подпись и описание узла, предупреждения защиты, заголовок корневого блока. */
import type { BlockNode, RootEntry } from '@shared'
import { CSS_PX_UNIT, ROOT_UNTITLED_LABEL } from '@/scripts/pages/canvas/constants'
import { escapeCommentText, toCommentLines, toSingleLine } from './export-escape'
import type { CommentParts } from './export-types'
import {
  EXPORT_COMMENT_CLOSE,
  EXPORT_COMMENT_OPEN,
  EXPORT_DESCRIPTION_SEPARATOR,
  EXPORT_INDENT,
  EXPORT_LIST_SEPARATOR,
  EXPORT_QUOTE_CLOSE,
  EXPORT_QUOTE_OPEN,
  EXPORT_REPEAT_MARK,
  EXPORT_ROOT_CENTERED,
  EXPORT_ROOT_MAX_WIDTH,
  EXPORT_ROOT_PREVIEW_HEIGHT,
  EXPORT_ROOT_PREVIEW_WIDTH,
  EXPORT_ROOT_TITLE,
  EXPORT_WARNING_TAG_REPLACED,
  EXPORT_WARNING_UNSAFE_VALUE,
  EXPORT_WORD_SEPARATOR,
} from './export-constants'

/** Склеивает непустые части через разделитель. */
function joinParts(parts: readonly string[], separator: string): string {
  return parts.filter((part) => part !== '').join(separator)
}

/** Строка в кавычках-ёлочках: `«Дашборд»`. */
export function quoted(text: string): string {
  return `${EXPORT_QUOTE_OPEN}${text}${EXPORT_QUOTE_CLOSE}`
}

/** Число px как текст: `1440px`. */
function pxText(value: number): string {
  return `${String(value)}${CSS_PX_UNIT}`
}

/** Знак повтора `×N` при `repeat > 1`, иначе пустая строка. */
function repeatMark(block: BlockNode): string {
  return block.repeat > 1 ? `${EXPORT_REPEAT_MARK}${String(block.repeat)}` : ''
}

/**
 * Части комментария узла: голова — подпись, `×N` и однострочное описание через « — »;
 * многострочное описание целиком уходит в тело. Экранирование — в `formatComment`.
 */
export function nodeCommentParts(block: BlockNode): CommentParts {
  const name = joinParts([toSingleLine(block.label), repeatMark(block)], EXPORT_WORD_SEPARATOR)
  const lines = toCommentLines(block.description)
  const [first] = lines
  if (lines.length === 1 && first !== undefined) {
    return { head: joinParts([name, toSingleLine(first)], EXPORT_DESCRIPTION_SEPARATOR), body: [] }
  }
  return { head: name, body: lines }
}

/**
 * Строки комментария на отступе `indent`: однострочный `<!-- head -->` или многострочный —
 * `<!-- head`, строки тела с отступом +1 уровень, `-->`. Пустые голова и тело → комментария нет.
 */
export function formatComment(head: string, body: readonly string[], indent: string): string[] {
  const safeHead = escapeCommentText(head)
  if (body.length === 0) {
    return safeHead === '' ? [] : [`${indent}${EXPORT_COMMENT_OPEN} ${safeHead} ${EXPORT_COMMENT_CLOSE}`]
  }
  const first = safeHead === '' ? EXPORT_COMMENT_OPEN : `${EXPORT_COMMENT_OPEN} ${safeHead}`
  // Пустые строки внутри описания выводятся без отступа, чтобы не оставлять хвостовых пробелов
  const lines = body.map((line) => (line === '' ? '' : `${indent}${EXPORT_INDENT}${escapeCommentText(line)}`))
  return [`${indent}${first}`, ...lines, `${indent}${EXPORT_COMMENT_CLOSE}`]
}

/** Комментарии-предупреждения перед элементом: по одному на отброшенное свойство (только имя) и о замене тега. */
export function warningComments(dropped: readonly string[], tagReplaced: boolean, indent: string): string[] {
  const heads = dropped.map((property) => `${EXPORT_WARNING_UNSAFE_VALUE} ${quoted(toSingleLine(property))}`)
  if (tagReplaced) heads.push(EXPORT_WARNING_TAG_REPLACED)
  return heads.flatMap((head) => formatComment(head, [], indent))
}

/** Описание размера корня: ширина (и фиксированная высота) превью или `max-width … по центру`. */
function rootSizeText(entry: RootEntry): string {
  const { width, height, exportMaxWidth } = entry.canvas
  if (exportMaxWidth) return `${EXPORT_ROOT_MAX_WIDTH} ${pxText(width)} ${EXPORT_ROOT_CENTERED}`
  const widthText = `${EXPORT_ROOT_PREVIEW_WIDTH} ${pxText(width)}`
  if (height === null) return widthText
  return `${widthText}${EXPORT_LIST_SEPARATOR}${EXPORT_ROOT_PREVIEW_HEIGHT} ${pxText(height)}`
}

/**
 * Заголовок корня: `Корневой блок «{подпись}» ×N, {размер}` и дополнительные пометки (`extraNotes`, в 8.7 —
 * «подставлен в …»); описание корня — следующими строками этого же комментария.
 */
export function rootHeaderComment(entry: RootEntry, extraNotes: readonly string[], indent: string): string[] {
  const label = toSingleLine(entry.node.label)
  const title = joinParts(
    [EXPORT_ROOT_TITLE, quoted(label === '' ? ROOT_UNTITLED_LABEL : label), repeatMark(entry.node)],
    EXPORT_WORD_SEPARATOR,
  )
  const head = joinParts(
    [`${title}${EXPORT_LIST_SEPARATOR}${rootSizeText(entry)}`, ...extraNotes.map(toSingleLine)],
    EXPORT_WORD_SEPARATOR,
  )
  return formatComment(head, toCommentLines(entry.node.description), indent)
}
