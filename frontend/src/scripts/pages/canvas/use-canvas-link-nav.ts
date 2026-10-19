/** Composable перехода по связи: от связи к её источнику — выделить корень-источник и показать его в центре поля. */
import { isLinkBlock, type NodeId } from '@shared'
import { rootRect } from './camera'
import { useCameraStore } from './camera-store'
import { useLayoutStore } from './layout-store'
import { findNode } from './tree-query'

/** Результат `useCanvasLinkNav`. */
export interface CanvasLinkNav {
  /** Переходит к источнику связи `linkId`; `false`, если это не связь или источника нет. */
  goToSource: (linkId: NodeId) => boolean
}

/** Возвращает переход к источнику связи (двойной клик по плашке, кнопка в секции «Связь»). */
export function useCanvasLinkNav(): CanvasLinkNav {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()

  /** Выделяет корень-источник и ставит его по центру видимой области, зум не меняется. */
  function goToSource(linkId: NodeId): boolean {
    const link = findNode(layoutStore.document, linkId)
    if (link === undefined || !isLinkBlock(link)) return false
    const source = layoutStore.document.roots.find((root) => root.node.id === link.sourceId)
    if (source === undefined) return false
    layoutStore.select(source.node.id)
    cameraStore.centerWorldRect(rootRect(source, cameraStore.rootHeights))
    return true
  }

  return { goToSource }
}
