/** Типы фрагментов CanvasNode и CanvasRoot: пропсы рекурсивного узла и корня на поле. */
import type { ContainerKind, LayoutNode, NodeId, RootEntry } from '@shared'

/**
 * Пропсы рекурсивного узла: сам узел, глубина (корень — 0) и вид контейнера родителя (`null` у корня).
 * Копия повтора: `copyOf` — id исходного блока (у настоящего блока не задан), `copyRoot` — верхний элемент копии.
 */
export interface CanvasNodeProps {
  node: LayoutNode
  depth: number
  parentKind: ContainerKind | null
  copyOf?: NodeId | null
  copyRoot?: boolean
  /** Остаток бюджета копий повтора для поддерева настоящего блока; по умолчанию — весь бюджет (`REPEAT_RENDER_BUDGET`). */
  copyBudget?: number
}

/** Пропсы корня на поле. */
export interface CanvasRootProps {
  root: RootEntry
}
