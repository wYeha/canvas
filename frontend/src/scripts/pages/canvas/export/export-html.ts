/**
 * Генератор HTML-скелета блока с поддеревом: инлайн-стили из `styleEntries` (как в превью; у пустых листьев контейнерные свойства по умолчанию опущены), подписи и описания
 * в комментариях, проверка тега и значений. На месте связи выводится её корень-источник со свойствами места
 * (`self`, повтор) и комментарием `компонент «…»`. Чистые функции: вывод зависит только от входа (без id и дат).
 */
import {
  isLinkBlock,
  type BlockNode,
  type ContainerKind,
  type FlexContainer,
  type LayoutDocument,
  type LayoutNode,
  type NodeId,
  type RootEntry,
} from '@shared'
import { repeatCount } from '@/scripts/pages/canvas/node-view'
import { findRootEntry } from '@/scripts/pages/canvas/tree-query'
import type { StyleEntry } from '@/scripts/pages/canvas/node-style'
import {
  componentCommentParts,
  componentsComment,
  formatComment,
  nodeCommentParts,
  rootHeaderComment,
  warningComments,
} from './export-comment'
import { gapVarEntries, usedComponents, usedGaps } from './export-components'
import { closeTag, exportStyleEntries, openTag, rootExportEntries, safeStyle, safeTag } from './export-style'
import type { CommentParts, RootOrder } from './export-types'
import { EXPORT_INDENT, EXPORT_NEWLINE } from './export-constants'

/** Всё, что нужно для вывода одного блока. */
interface BlockRender {
  block: BlockNode
  parentKind: ContainerKind | null
  /** Направление flex-родителя: главная ось для режимов размера. */
  parentDirection: FlexContainer['direction'] | undefined
  depth: number
  comment: CommentParts
  /** Export-only свойства после `exportStyleEntries` (только у корня с `exportMaxWidth`). */
  extraEntries: readonly StyleEntry[]
  /** Корни, внутри подстановки которых выводится блок (и корень вывода): защита от цикла в непроверенном документе. */
  sources: readonly NodeId[]
}

/** Готовые теги элемента и его отступ. */
interface ElementFrame {
  indent: string
  open: string
  close: string
}

/** Контейнер: комментарий строкой перед открывающим тегом, дети на уровень глубже, закрывающий тег. */
function blockLines(doc: LayoutDocument, render: BlockRender, frame: ElementFrame): string[] {
  const { block, depth, comment, sources } = render
  const kind = block.container.kind
  const parentDirection = block.container.kind === 'flex' ? block.container.direction : undefined
  return [
    ...formatComment(comment.head, comment.body, frame.indent),
    `${frame.indent}${frame.open}`,
    ...block.children.flatMap((child) => exportNodeLines(doc, child, kind, depth + 1, { sources, parentDirection })),
    `${frame.indent}${frame.close}`,
  ]
}

/** Лист: однострочный комментарий внутри тега в одну строку; многострочный раскрывает тег на несколько строк. */
function leafLines(comment: CommentParts, frame: ElementFrame): string[] {
  if (comment.body.length === 0) {
    const inline = formatComment(comment.head, [], '').join('')
    return [`${frame.indent}${frame.open}${inline}${frame.close}`]
  }
  return [
    `${frame.indent}${frame.open}`,
    ...formatComment(comment.head, comment.body, `${frame.indent}${EXPORT_INDENT}`),
    `${frame.indent}${frame.close}`,
  ]
}

/** Блок целиком: проверенные стиль и тег, предупреждения перед элементом, затем контейнер или лист. */
function renderBlock(doc: LayoutDocument, render: BlockRender): string[] {
  const { block, parentKind, parentDirection, depth, extraEntries } = render
  const indent = EXPORT_INDENT.repeat(depth)
  const { style, dropped } = safeStyle([...exportStyleEntries(block, parentKind, parentDirection), ...extraEntries])
  const { tag, replaced } = safeTag(block.tag)
  // У корня повтора нет (в модели он всегда 1), у вложенного блока и места связи — повтор блока
  const frame: ElementFrame = { indent, open: openTag(tag, style, repeatCount(block)), close: closeTag(tag) }
  const body = block.children.length > 0 ? blockLines(doc, render, frame) : leafLines(render.comment, frame)
  return [...warningComments(dropped, replaced, indent), ...body]
}

/**
 * Вывод связи: корень-источник со свойствами места (`self` и повтор связи) и комментарием `компонент «…»`.
 * Источника нет или он уже выводится выше по цепочке (цикл) — `null`, связь выводится как обычный пустой блок.
 */
function linkRender(
  doc: LayoutDocument,
  link: BlockNode,
  base: Omit<BlockRender, 'block' | 'comment'>,
): BlockRender | null {
  if (!isLinkBlock(link) || base.sources.includes(link.sourceId)) return null
  const source = findRootEntry(doc, link.sourceId)?.node
  if (source === undefined) return null
  return {
    ...base,
    block: { ...source, self: link.self, repeat: link.repeat },
    comment: componentCommentParts(source, link),
    sources: [...base.sources, source.id],
  }
}

/**
 * Окружение узла в выводе: корни, внутри которых уже идёт вывод (для связей: источник не подставляется сам в себя),
 * направление flex-родителя и export-only свойства элемента (определения переменных зазора у верхнего элемента).
 */
export interface NodeLinesContext {
  sources?: readonly NodeId[]
  parentDirection?: FlexContainer['direction']
  extraEntries?: readonly StyleEntry[]
}

/** Строки узла с поддеревом на глубине `depth`; `parentKind` — вид контейнера реального родителя (`null` у корня). */
export function exportNodeLines(
  doc: LayoutDocument,
  node: LayoutNode,
  parentKind: ContainerKind | null,
  depth: number,
  context: NodeLinesContext = {},
): string[] {
  const base = {
    parentKind,
    parentDirection: context.parentDirection,
    depth,
    extraEntries: context.extraEntries ?? [],
    sources: context.sources ?? [],
  }
  const render = linkRender(doc, node, base) ?? { ...base, block: node, comment: nodeCommentParts(node) }
  return renderBlock(doc, render)
}

/**
 * Строки корневого блока: заголовок с подписью, размером превью и описанием (с нумерацией `order`, если корней
 * несколько), затем элемент со стилями `exportStyleEntries(node, null)` + `max-width`/`margin` при `exportMaxWidth`.
 * Своего комментария подписи у корня нет — всё уже в заголовке.
 */
export function exportRootLines(doc: LayoutDocument, entry: RootEntry, order?: RootOrder): string[] {
  return [
    ...rootHeaderComment(entry, '', order),
    ...renderBlock(doc, {
      block: entry.node,
      parentKind: null,
      parentDirection: undefined,
      depth: 0,
      comment: { head: '', body: [] },
      extraEntries: [...rootExportEntries(entry.canvas), ...gapVarEntries(usedGaps(doc, [entry.node]))],
      sources: [entry.node.id],
    }),
  ]
}

/**
 * HTML корневого блока (см. `exportRootLines`), перед ним — список подставленных компонентов с описаниями.
 * Текст заканчивается ровно одним переводом строки.
 */
export function exportRootHtml(doc: LayoutDocument, entry: RootEntry): string {
  const components = componentsComment(usedComponents(doc, [entry.node], [entry.node.id]), '')
  return `${[...components, ...exportRootLines(doc, entry)].join(EXPORT_NEWLINE)}${EXPORT_NEWLINE}`
}
