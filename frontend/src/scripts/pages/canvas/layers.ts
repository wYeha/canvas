/** Чистая логика панели «Слои»: значок, подпись и дети строки, свёрнутые ветки, классы строки. Без Vue и DOM. */
import type { LayoutNode, NodeId } from '@shared'
import { LAYER_COLLAPSE_LABEL, LAYER_EXPAND_LABEL, ROOT_UNTITLED_LABEL } from './constants'
import { blockLabel, linkCaptionFromLabel } from './node-view'

/** Значок строки слоя: вид контейнера блока или связь. */
export type LayerIcon = 'flex' | 'grid' | 'link'

/** Состояние строки слоя для классов. */
export interface LayerRowState {
  root: boolean
  selected: boolean
  hovered: boolean
}

/** Значок строки: `flex` / `grid` у блока, `link` у плашки связи. */
export function layerIcon(node: LayoutNode): LayerIcon {
  return node.type === 'link' ? 'link' : node.container.kind
}

/** Подпись строки: подпись блока (или заглушка без подписи) либо `→ <источник>` у связи. */
export function layerCaption(node: LayoutNode, rootLabels: ReadonlyMap<NodeId, string>): string {
  if (node.type === 'link') return linkCaptionFromLabel(rootLabels.get(node.sourceId))
  const label = blockLabel(node)
  return label === '' ? ROOT_UNTITLED_LABEL : label
}

/** Дети строки: у блока — его дети, у связи — никого (источник показан своим корнем). */
export function layerChildren(node: LayoutNode): readonly LayoutNode[] {
  return node.type === 'block' ? node.children : []
}

/** Переключает ветку `id` между свёрнутой и раскрытой; возвращает новое множество свёрнутых. */
export function toggleCollapsed(collapsed: ReadonlySet<NodeId>, id: NodeId): ReadonlySet<NodeId> {
  const next = new Set(collapsed)
  if (!next.delete(id)) next.add(id)
  return next
}

/**
 * Раскрывает предков последнего узла пути, чтобы выделенная строка была видна. Сам узел не трогает.
 * Если раскрывать нечего, возвращает то же множество (по ссылке): так watcher не перерисует дерево зря.
 */
export function expandPath(collapsed: ReadonlySet<NodeId>, path: readonly LayoutNode[]): ReadonlySet<NodeId> {
  const ancestors = path.slice(0, -1).filter((node) => collapsed.has(node.id))
  if (ancestors.length === 0) return collapsed
  const next = new Set(collapsed)
  for (const node of ancestors) next.delete(node.id)
  return next
}

/** BEM-классы строки: база, корень, выделение, наведение (наведение поверх выделения не показываем). */
export function layerRowClasses(state: LayerRowState): string[] {
  const classes = ['canvas-layer-item__row']
  if (state.root) classes.push('canvas-layer-item__row--root')
  if (state.selected) classes.push('canvas-layer-item__row--selected')
  else if (state.hovered) classes.push('canvas-layer-item__row--hovered')
  return classes
}

/** BEM-классы шеврона: у свёрнутой ветки он повёрнут. */
export function layerChevronClasses(expanded: boolean): string[] {
  return expanded
    ? ['canvas-layer-item__chevron']
    : ['canvas-layer-item__chevron', 'canvas-layer-item__chevron--collapsed']
}

/** Подсказка кнопки сворачивания. */
export function layerToggleLabel(expanded: boolean): string {
  return expanded ? LAYER_COLLAPSE_LABEL : LAYER_EXPAND_LABEL
}
