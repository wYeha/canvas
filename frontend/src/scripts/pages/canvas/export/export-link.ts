/**
 * Экспорт плашки связи. До этапа 8.7 — плейсхолдер `<div><!-- компонент «…» --></div>` со стилями «как ребёнок»;
 * в 8.7 здесь появится подстановка корня-источника, формат остального экспорта не меняется.
 */
import type { ContainerKind, LayoutDocument, LinkNode } from '@shared'
import { LINK_MISSING_LABEL, ROOT_UNTITLED_LABEL } from '@/scripts/pages/canvas/constants'
import { styleEntries } from '@/scripts/pages/canvas/node-style'
import { findRootEntry } from '@/scripts/pages/canvas/tree-query'
import { formatComment, quoted, warningComments } from './export-comment'
import { toSingleLine } from './export-escape'
import { closeTag, openTag, safeStyle } from './export-style'
import { EXPORT_INDENT, EXPORT_LINK_COMPONENT, EXPORT_LINK_TAG, EXPORT_WORD_SEPARATOR } from './export-constants'

/** Подпись источника связи: нет корня → «без источника», пустая подпись → «Без подписи». */
function sourceLabel(doc: LayoutDocument, link: LinkNode): string {
  const entry = findRootEntry(doc, link.sourceId)
  if (!entry) return LINK_MISSING_LABEL
  const label = toSingleLine(entry.node.label)
  return label === '' ? ROOT_UNTITLED_LABEL : label
}

/** Строки плейсхолдера связи на глубине `depth`: предупреждения защиты и `<div style="…"><!-- компонент «…» --></div>`. */
export function exportLinkLines(
  doc: LayoutDocument,
  link: LinkNode,
  parentKind: ContainerKind | null,
  depth: number,
): string[] {
  const indent = EXPORT_INDENT.repeat(depth)
  const { style, dropped } = safeStyle(styleEntries(link, parentKind))
  const head = `${EXPORT_LINK_COMPONENT}${EXPORT_WORD_SEPARATOR}${quoted(sourceLabel(doc, link))}`
  const comment = formatComment(head, [], '').join('')
  return [
    ...warningComments(dropped, false, indent),
    `${indent}${openTag(EXPORT_LINK_TAG, style)}${comment}${closeTag(EXPORT_LINK_TAG)}`,
  ]
}
