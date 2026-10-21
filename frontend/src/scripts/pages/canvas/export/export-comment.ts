/** Комментарии экспорта: подпись и описание узла, пометка компонента, предупреждения защиты, заголовок корневого блока. */
import type { BlockNode, RootEntry } from '@shared'
import { CSS_PX_UNIT, ROOT_UNTITLED_LABEL } from '@/scripts/pages/canvas/constants'
import { repeatMark } from '@/scripts/pages/canvas/node-view'
import { sizeMode, sizeValue } from '@/scripts/pages/canvas/size-mode'
import { escapeCommentText, toCommentLines, toSingleLine } from './export-escape'
import type { CommentParts, RootOrder } from './export-types'
import {
  EXPORT_COMMENT_CLOSE,
  EXPORT_COMMENT_OPEN,
  EXPORT_COMPONENT_TITLE,
  EXPORT_COMPONENTS_TITLE,
  EXPORT_DESCRIPTION_SEPARATOR,
  EXPORT_DOCUMENT_ROOTS_COUNT,
  EXPORT_DOCUMENT_TITLE,
  EXPORT_FIXED_INTENT,
  EXPORT_INDENT,
  EXPORT_LIST_SEPARATOR,
  EXPORT_ORDER_FORMAT,
  EXPORT_QUOTE_CLOSE,
  EXPORT_QUOTE_OPEN,
  EXPORT_REPEAT_MARK,
  EXPORT_ROOT_CENTERED,
  EXPORT_ROOT_FULL_SCREEN,
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

/**
 * Части комментария узла: голова — подпись, `×N` и однострочное описание через « — »;
 * многострочное описание целиком уходит в тело. Экранирование — в `formatComment`.
 */
export function nodeCommentParts(block: BlockNode): CommentParts {
  const name = joinParts([toSingleLine(block.label), ...fixedIntents(block)], EXPORT_LIST_SEPARATOR)
  return commentWithName(name, block)
}

/** Намерения «фиксированная ширина/высота» у осей в фиксированном режиме без числа: размер не задан, но не тянется. */
function fixedIntents(block: BlockNode): string[] {
  const axes = ['width', 'height'] as const
  return axes
    .filter((axis) => sizeMode(block.self, axis) === 'fixed' && sizeValue(block.self, axis) === null)
    .map((axis) => EXPORT_FIXED_INTENT[axis])
}

/** Имя компонента в кавычках: подпись корня-источника или «Без подписи». */
function componentName(source: BlockNode): string {
  const label = toSingleLine(source.label)
  return quoted(label === '' ? ROOT_UNTITLED_LABEL : label)
}

/**
 * Части комментария корня-источника, подставленного на место связи: `компонент «подпись»` и `×N` места. Описание
 * источника здесь не повторяется — оно один раз в списке компонентов (`componentsComment`).
 */
export function componentCommentParts(source: BlockNode, repeatOf: BlockNode): CommentParts {
  const name = joinParts([EXPORT_COMPONENT_TITLE, componentName(source)], EXPORT_WORD_SEPARATOR)
  return { head: joinParts([name, repeatMark(repeatOf, EXPORT_REPEAT_MARK)], EXPORT_WORD_SEPARATOR), body: [] }
}

/** Строки списка компонентов: имя и описание (многострочное — продолжением с отступом). */
function componentLines(source: BlockNode): string[] {
  const [first, ...rest] = toCommentLines(source.description)
  const head = joinParts([componentName(source), first ?? ''], EXPORT_DESCRIPTION_SEPARATOR)
  return [head, ...rest.map((line) => (line === '' ? '' : `${EXPORT_INDENT}${line}`))]
}

/** Комментарий-список компонентов, подставленных в вывод (по порядку первого появления); нет компонентов — пусто. */
export function componentsComment(sources: readonly BlockNode[], indent: string): string[] {
  if (sources.length === 0) return []
  return formatComment(EXPORT_COMPONENTS_TITLE, sources.flatMap(componentLines), indent)
}

/** Голова из имени, `×N` блока и однострочного описания; многострочное описание — в тело. */
function commentWithName(label: string, block: BlockNode): CommentParts {
  const name = joinParts([label, repeatMark(block, EXPORT_REPEAT_MARK)], EXPORT_WORD_SEPARATOR)
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

/** Описание размера корня: ширина превью или `max-width … по центру`, у «экрана целиком» — пометка 100vh. */
export function rootSizeText(entry: RootEntry): string {
  const base = rootWidthText(entry)
  return entry.canvas.fullScreen === true ? `${base}${EXPORT_LIST_SEPARATOR}${EXPORT_ROOT_FULL_SCREEN}` : base
}

/** Ширина корня в заголовке: ширина (и фиксированная высота) превью или `max-width … по центру`. */
function rootWidthText(entry: RootEntry): string {
  const { width, height, exportMaxWidth } = entry.canvas
  if (exportMaxWidth) return `${EXPORT_ROOT_MAX_WIDTH} ${pxText(width)} ${EXPORT_ROOT_CENTERED}`
  const widthText = `${EXPORT_ROOT_PREVIEW_WIDTH} ${pxText(width)}`
  if (height === null) return widthText
  return `${widthText}${EXPORT_LIST_SEPARATOR}${EXPORT_ROOT_PREVIEW_HEIGHT} ${pxText(height)}`
}

/**
 * Заголовок корня: `Корневой блок «{подпись}», {размер}` (у корня повтора нет); описание корня — следующими строками этого же комментария. `order` (несколько корней) —
 * префикс `{i} из {n}. `.
 */
export function rootHeaderComment(entry: RootEntry, indent: string, order?: RootOrder): string[] {
  const label = toSingleLine(entry.node.label)
  const title = joinParts(
    [EXPORT_ROOT_TITLE, quoted(label === '' ? ROOT_UNTITLED_LABEL : label)],
    EXPORT_WORD_SEPARATOR,
  )
  const head = `${title}${EXPORT_LIST_SEPARATOR}${rootSizeText(entry)}`
  return formatComment(`${orderPrefix(order)}${head}`, toCommentLines(entry.node.description), indent)
}

/** Префикс нумерации корня `1 из 3. ` или пустая строка. */
function orderPrefix(order: RootOrder | undefined): string {
  if (!order) return ''
  return EXPORT_ORDER_FORMAT.replace('{i}', String(order.index)).replace('{n}', String(order.total))
}

/** Шапка экспорта нескольких корней: `Документ «{имя}»: корневых блоков {n}`. */
export function documentHeaderComment(docName: string, rootsCount: number): string[] {
  const head = `${EXPORT_DOCUMENT_TITLE} ${quoted(toSingleLine(docName))}${EXPORT_DOCUMENT_ROOTS_COUNT} ${String(rootsCount)}`
  return formatComment(head, [], '')
}
