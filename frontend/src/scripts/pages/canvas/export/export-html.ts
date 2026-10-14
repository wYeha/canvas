/**
 * Генератор HTML-скелета блока с поддеревом: инлайн-стили из `styleEntries` (как в превью; у пустых листьев контейнерные свойства по умолчанию опущены), подписи и описания
 * в комментариях, проверка тега и значений. Чистые функции: вывод зависит только от входа (без id и дат).
 */
import type { BlockNode, ContainerKind, LayoutDocument, LayoutNode, RootEntry } from '@shared'
import type { StyleEntry } from '@/scripts/pages/canvas/node-style'
import { formatComment, nodeCommentParts, rootHeaderComment, warningComments } from './export-comment'
import { exportLinkLines } from './export-link'
import { closeTag, exportStyleEntries, openTag, rootExportEntries, safeStyle, safeTag } from './export-style'
import type { CommentParts } from './export-types'
import { EXPORT_INDENT, EXPORT_NEWLINE } from './export-constants'

/** Всё, что нужно для вывода одного блока. */
interface BlockRender {
  block: BlockNode
  parentKind: ContainerKind | null
  depth: number
  comment: CommentParts
  /** Export-only свойства после `exportStyleEntries` (только у корня с `exportMaxWidth`). */
  extraEntries: readonly StyleEntry[]
}

/** Готовые теги элемента и его отступ. */
interface ElementFrame {
  indent: string
  open: string
  close: string
}

/** Контейнер: комментарий строкой перед открывающим тегом, дети на уровень глубже, закрывающий тег. */
function blockLines(doc: LayoutDocument, render: BlockRender, frame: ElementFrame): string[] {
  const { block, depth, comment } = render
  const kind = block.container.kind
  return [
    ...formatComment(comment.head, comment.body, frame.indent),
    `${frame.indent}${frame.open}`,
    ...block.children.flatMap((child) => exportNodeLines(doc, child, kind, depth + 1)),
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
  const { block, parentKind, depth, extraEntries } = render
  const indent = EXPORT_INDENT.repeat(depth)
  const { style, dropped } = safeStyle([...exportStyleEntries(block, parentKind), ...extraEntries])
  const { tag, replaced } = safeTag(block.tag)
  const frame: ElementFrame = { indent, open: openTag(tag, style), close: closeTag(tag) }
  const body = block.children.length > 0 ? blockLines(doc, render, frame) : leafLines(render.comment, frame)
  return [...warningComments(dropped, replaced, indent), ...body]
}

/** Строки узла с поддеревом на глубине `depth`; `parentKind` — вид контейнера реального родителя (`null` у корня). */
export function exportNodeLines(
  doc: LayoutDocument,
  node: LayoutNode,
  parentKind: ContainerKind | null,
  depth: number,
): string[] {
  if (node.type === 'link') return exportLinkLines(doc, node, parentKind, depth)
  return renderBlock(doc, { block: node, parentKind, depth, comment: nodeCommentParts(node), extraEntries: [] })
}

/**
 * HTML корневого блока: заголовок с подписью, размером превью и описанием, затем элемент со стилями
 * `exportStyleEntries(node, null)` + `max-width`/`margin` при `exportMaxWidth`. Своего комментария подписи у корня нет —
 * всё уже в заголовке. Текст заканчивается ровно одним переводом строки.
 */
export function exportRootHtml(doc: LayoutDocument, entry: RootEntry): string {
  const lines = [
    ...rootHeaderComment(entry, [], ''),
    ...renderBlock(doc, {
      block: entry.node,
      parentKind: null,
      depth: 0,
      comment: { head: '', body: [] },
      extraEntries: rootExportEntries(entry.canvas),
    }),
  ]
  return `${lines.join(EXPORT_NEWLINE)}${EXPORT_NEWLINE}`
}
