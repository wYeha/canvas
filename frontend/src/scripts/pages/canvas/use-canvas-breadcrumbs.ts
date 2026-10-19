/** Composable плашки пути: сегменты от корня до выделенного блока и переход к узлу по клику на сегмент. */
import { computed } from 'vue'
import type { NodeId } from '@shared'
import { BREADCRUMB_EMPTY, BREADCRUMB_SEPARATOR } from './constants'
import { useLayoutStore } from './layout-store'
import { breadcrumbSegments } from './selection'

/** Возвращает сегменты пути (пусто без выделения), тексты разделителя и пустого состояния, обработчик клика. */
export function useCanvasBreadcrumbs() {
  const layoutStore = useLayoutStore()

  /** Сегменты пути: корень, затем вложенные, последний — выделенный. */
  const segments = computed(() => breadcrumbSegments(layoutStore.selectedPath))

  /** Выделяет узел по клику на сегмент. */
  function selectSegment(id: NodeId): void {
    layoutStore.select(id)
  }

  return { segments, selectSegment, separator: BREADCRUMB_SEPARATOR, emptyText: BREADCRUMB_EMPTY }
}
