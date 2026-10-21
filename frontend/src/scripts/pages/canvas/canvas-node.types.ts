/** Типы фрагментов CanvasNode и CanvasRoot: пропсы рекурсивного узла и корня на поле. */
import type { ContainerKind, FlexContainer, LayoutNode, NodeId, RootEntry } from '@shared'

/**
 * Пропсы рекурсивного узла: сам узел, глубина (корень — 0) и вид контейнера родителя (`null` у корня).
 * Копия повтора: `copyOf` — id исходного блока (у настоящего блока не задан), `copyRoot` — верхний элемент копии.
 */
export interface CanvasNodeProps {
  node: LayoutNode
  depth: number
  parentKind: ContainerKind | null
  /** Направление flex-родителя (главная ось для режимов размера); у grid-родителя и корня не задано. */
  parentDirection?: FlexContainer['direction']
  /** Корень с фиксированной высотой превью: в «Пропорциях» обрезается по высоте (16.4). */
  rootFixedHeight?: boolean
  copyOf?: NodeId | null
  copyRoot?: boolean
  /** Остаток бюджета копий повтора для поддерева настоящего блока; по умолчанию — весь бюджет (`REPEAT_RENDER_BUDGET`). */
  copyBudget?: number
  /** Копия повтора рисуется тенью без содержимого (16.5). */
  shadow?: boolean
  /** Узел внутри живого зеркала связи: вложенные связи здесь рисуются плашками, не зеркалом. */
  inMirror?: boolean
}

/** Пропсы корня на поле. */
export interface CanvasRootProps {
  root: RootEntry
}
