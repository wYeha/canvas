/** Типы фрагментов CanvasNode и CanvasRoot: пропсы рекурсивного узла и корня на поле. */
import type { ContainerKind, LayoutNode, RootEntry } from '@shared'

/** Пропсы рекурсивного узла: сам узел, глубина (корень — 0) и вид контейнера родителя (`null` у корня). */
export interface CanvasNodeProps {
  node: LayoutNode
  depth: number
  parentKind: ContainerKind | null
}

/** Пропсы корня на поле. */
export interface CanvasRootProps {
  root: RootEntry
}
