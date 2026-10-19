/** Охват экспорта: отбор корней в порядке слоёв документа, склейка нескольких корней с шапкой и нумерацией, диспетчер охвата. */
import type { LayoutDocument, NodeId } from '@shared'
import { documentHeaderComment } from './export-comment'
import { exportRootHtml, exportRootLines } from './export-html'
import { exportSelectedHtml } from './export-selected'
import type { ExportOptions, ExportRootPlan, ExportScope } from './export-types'
import { EXPORT_NEWLINE } from './export-constants'

/**
 * План корней: `doc.roots` (порядок слоёв), отфильтрованные по множеству id (`'all'` — все); несуществующие id
 * игнорируются.
 */
export function planRoots(doc: LayoutDocument, rootIds: readonly NodeId[] | 'all'): ExportRootPlan[] {
  const wanted = rootIds === 'all' ? null : new Set<NodeId>(rootIds)
  return doc.roots.filter((entry) => wanted === null || wanted.has(entry.node.id)).map((entry) => ({ entry }))
}

/**
 * HTML нескольких корней: 0 → пустая строка, 1 → как `exportRootHtml` (без шапки и нумерации), ≥2 → шапка документа
 * и корни с заголовками `{i} из {n}.` через пустую строку. Текст заканчивается ровно одним переводом строки.
 */
export function exportRootsHtml(doc: LayoutDocument, plans: readonly ExportRootPlan[]): string {
  const [only] = plans
  if (only === undefined) return ''
  if (plans.length === 1) return exportRootHtml(doc, only.entry)
  const total = plans.length
  const blocks = plans.map((plan, i) => exportRootLines(doc, plan.entry, { index: i + 1, total }))
  const lines = [...documentHeaderComment(doc.name, total), ...blocks.flatMap((lines) => ['', ...lines])]
  return `${lines.join(EXPORT_NEWLINE)}${EXPORT_NEWLINE}`
}

/** Единая точка экспорта для модалки: диспетчер по охвату (выделенный узел, отмеченные корни, все корни). */
export function exportScopeHtml(doc: LayoutDocument, scope: ExportScope, options: ExportOptions): string {
  if (scope.kind === 'selected') return exportSelectedHtml(doc, scope.nodeId, options)
  return exportRootsHtml(doc, planRoots(doc, scope.kind === 'all' ? 'all' : scope.rootIds))
}
