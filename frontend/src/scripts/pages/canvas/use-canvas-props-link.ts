/** Логика фрагмента CanvasPropsLink: имя источника выделенной связи и переход к нему. */
import { computed, type ComputedRef } from 'vue'
import { isLinkBlock } from '@shared'
import { useLayoutStore } from './layout-store'
import { linkSourceName } from './node-view'
import { useCanvasLinkNav } from './use-canvas-link-nav'

/** Состояние секции «Связь». */
export interface CanvasPropsLinkState {
  /** Имя источника выделенной связи; `null`, если выделена не связь. */
  source: ComputedRef<string | null>
  /** Переходит к источнику выделенной связи. */
  goToSource: () => void
}

/** Возвращает имя источника выделенной связи и переход к нему. */
export function useCanvasPropsLink(): CanvasPropsLinkState {
  const layoutStore = useLayoutStore()
  const linkNav = useCanvasLinkNav()

  const source = computed(() => {
    const node = layoutStore.selectedNode
    return node !== undefined && isLinkBlock(node) ? linkSourceName(node.sourceId, layoutStore.rootLabels) : null
  })

  /** Выделяет источник и показывает его в центре поля. */
  function goToSource(): void {
    const node = layoutStore.selectedNode
    if (node !== undefined) linkNav.goToSource(node.id)
  }

  return { source, goToSource }
}
