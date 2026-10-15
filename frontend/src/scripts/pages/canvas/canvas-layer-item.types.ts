/** Типы фрагмента CanvasLayerItem: пропсы рекурсивной строки панели «Слои». */
import type { LayoutNode } from '@shared'

/** Пропсы строки слоя: узел и глубина (корень — 0; корневая строка оформлена иначе). */
export interface CanvasLayerItemProps {
  node: LayoutNode
  depth: number
}
