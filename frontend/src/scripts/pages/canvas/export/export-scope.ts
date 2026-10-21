/** Охват экспорта: отбор корней в порядке слоёв документа, склейка нескольких корней с шапкой и нумерацией, диспетчер охвата. */
import { buildLinkIndex, type LayoutDocument, type NodeId } from '@shared'
import { componentsComment, documentHeaderComment } from './export-comment'
import { usedComponents } from './export-components'
import { exportRootHtml, exportRootLines } from './export-html'
import { exportSelectedHtml } from './export-selected'
import type { ExportOptions, ExportRootPlan, ExportScope } from './export-types'
import { EXPORT_NEWLINE } from './export-constants'

/** Корни, подключённые связями куда-либо: при экспорте всех они уже выведены на местах своих связей. */
function connectedRoots(doc: LayoutDocument): Set<NodeId> {
  return new Set(buildLinkIndex(doc).placements.map((placement) => placement.sourceId))
}

/**
 * План корней: `doc.roots` (порядок слоёв), отфильтрованные по множеству id; несуществующие id игнорируются.
 * `'all'` — все корни, кроме подключённых связями: они выводятся внутри целей (без циклов каждый подключённый корень
 * попадает в вывод через цепочку до неподключённого), отдельно не повторяются.
 */
export function planRoots(doc: LayoutDocument, rootIds: readonly NodeId[] | 'all'): ExportRootPlan[] {
  const wanted = rootIds === 'all' ? null : new Set<NodeId>(rootIds)
  const skipped = rootIds === 'all' ? connectedRoots(doc) : new Set<NodeId>()
  return doc.roots
    .filter((entry) => (wanted === null || wanted.has(entry.node.id)) && !skipped.has(entry.node.id))
    .map((entry) => ({ entry }))
}

/**
 * HTML нескольких корней: 0 → пустая строка, 1 → как `exportRootHtml` (без шапки и нумерации), ≥2 → шапка документа
 * со списком подставленных компонентов и корни с заголовками `{i} из {n}.` через пустую строку. Текст заканчивается ровно одним переводом строки.
 */
export function exportRootsHtml(doc: LayoutDocument, plans: readonly ExportRootPlan[]): string {
  const [only] = plans
  if (only === undefined) return ''
  if (plans.length === 1) return exportRootHtml(doc, only.entry)
  const total = plans.length
  const blocks = plans.map((plan, i) => exportRootLines(doc, plan.entry, { index: i + 1, total }))
  const roots = plans.map((plan) => plan.entry.node)
  const used = usedComponents(
    doc,
    roots,
    roots.map((node) => node.id),
  )
  const components = componentsComment(used, '')
  const header = [...documentHeaderComment(doc.name, total), ...(components.length > 0 ? ['', ...components] : [])]
  const lines = [...header, ...blocks.flatMap((lines) => ['', ...lines])]
  return `${lines.join(EXPORT_NEWLINE)}${EXPORT_NEWLINE}`
}

/** Единая точка экспорта для модалки: диспетчер по охвату (выделенный узел, отмеченные корни, все корни). */
export function exportScopeHtml(doc: LayoutDocument, scope: ExportScope, options: ExportOptions): string {
  if (scope.kind === 'selected') return exportSelectedHtml(doc, scope.nodeId, options)
  return exportRootsHtml(doc, planRoots(doc, scope.kind === 'all' ? 'all' : scope.rootIds))
}
