/** Экспорт выделенного узла: корень — как корневой блок с заголовком, вложенный блок — контекст + поддерево. */
import type { LayoutDocument, NodeId } from '@shared'
import { findParent, findNode, findRootEntry } from '@/scripts/pages/canvas/tree-query'
import { componentsComment } from './export-comment'
import { usedComponents } from './export-components'
import { contextLines } from './export-context'
import { exportNodeLines, exportRootHtml } from './export-html'
import type { ExportOptions } from './export-types'
import { EXPORT_NEWLINE } from './export-constants'

/**
 * HTML выделенного узла. Вложенный узел выводится со стилями «как ребёнок» реального родителя (`self` виден),
 * перед ним — комментарий-контекст и список подставленных компонентов. Узла нет → пустая строка. Текст заканчивается ровно одним переводом строки.
 */
export function exportSelectedHtml(doc: LayoutDocument, nodeId: NodeId, options: ExportOptions): string {
  const entry = findRootEntry(doc, nodeId)
  if (entry) return exportRootHtml(doc, entry)
  const node = findNode(doc, nodeId)
  const parent = findParent(doc, nodeId)
  if (!node || !parent) return ''
  const components = componentsComment(usedComponents(doc, [node]), '')
  const lines = [
    ...contextLines(doc, nodeId, options),
    ...components,
    ...exportNodeLines(doc, node, parent.container.kind, 0),
  ]
  return `${lines.join(EXPORT_NEWLINE)}${EXPORT_NEWLINE}`
}
