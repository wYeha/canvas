/**
 * Чистая логика вставки скопированного блока: свежие id у всего поддерева и чистка связей, чей источник
 * (корневой блок) к моменту вставки удалён. Без Vue и Pinia.
 */
import type { LayoutDocument, LayoutNode } from '@shared'
import { cloneSubtree } from './tree'

/** Убирает из поддерева связи на несуществующие корни; `null`, если сам узел — такая связь. */
function stripDanglingLinks(node: LayoutNode, rootIds: ReadonlySet<string>): LayoutNode | null {
  if (node.type === 'link') return rootIds.has(node.sourceId) ? node : null
  const children = node.children.flatMap((child) => {
    const kept = stripDanglingLinks(child, rootIds)
    return kept === null ? [] : [kept]
  })
  return { ...node, children }
}

/**
 * Готовит копию к вставке в документ `doc`: новые id, связи на отсутствующие корни убираются (иначе документ
 * перестанет проходить проверку). `null`, если вставлять нечего: скопирована связь, источник которой удалён.
 */
export function prepareForPaste(doc: LayoutDocument, copied: LayoutNode): LayoutNode | null {
  const rootIds = new Set(doc.roots.map((root) => root.node.id))
  const clean = stripDanglingLinks(copied, rootIds)
  return clean === null ? null : cloneSubtree(clean)
}
