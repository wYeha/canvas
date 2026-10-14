/** Охват экспорта: выбранный вид, отмеченные корни, замер ширин выделенного узла и его родителя. */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import type { NodeId } from '@shared'
import { useCameraStore } from '@/scripts/pages/canvas/camera-store'
import type { ExportScope } from '@/scripts/pages/canvas/export/export-types'
import { useLayoutStore } from '@/scripts/pages/canvas/layout-store'
import { measureNodeWorldRect } from '@/scripts/pages/canvas/node-dom'
import { rootTitle, rootWidthText } from '@/scripts/pages/canvas/node-view'
import { findParent } from '@/scripts/pages/canvas/tree-query'
import type { UiSegmentedOption } from '@/scripts/components/ui-segmented/ui-segmented.types'
import { EXPORT_SCOPE_OPTIONS } from './export-modal.constants'
import type { ExportRootRow, ExportScopeKind } from './export-modal.types'

/** Результат `useExportScope`. */
export interface ExportScopeState {
  /** Выбранный охват (значение сегментов). */
  scopeKind: Ref<ExportScopeKind>
  /** Сегменты охвата: «выделенный» недоступен без выделения. */
  scopeOptions: ComputedRef<UiSegmentedOption[]>
  /** Строки списка корней с отметками. */
  rows: ComputedRef<ExportRootRow[]>
  /** Переключает отметку корня. */
  toggleRoot: (id: NodeId, checked: boolean) => void
  /** Охват для экспорта; `null`, если выбран «выделенный блок», а выделения нет. */
  scope: ComputedRef<ExportScope | null>
  /** Замеренные ширины выделенного узла и его родителя (CSS px, округлены). */
  measuredWidths: Ref<ReadonlyMap<NodeId, number>>
}

/** Охват экспорта поверх открытости окна: при открытии выбирает охват, замеряет ширины, при первом — отмечает корни. */
export function useExportScope(open: Ref<boolean>): ExportScopeState {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const scopeKind = ref<ExportScopeKind>('all')
  const checkedIds = ref<Set<NodeId>>(new Set())
  const measuredWidths = ref<ReadonlyMap<NodeId, number>>(new Map())
  let checkedInitialized = false

  /** Ширина узла в превью, округлённая; `null`, если узел не отрисован. */
  function measureWidth(id: NodeId): number | null {
    const rect = measureNodeWorldRect(id, cameraStore.camera.zoom)
    return rect === null ? null : Math.round(rect.width)
  }

  /** Замеряет выделенный узел и его родителя (для «~ширины» в комментарии-контексте). */
  function measureSelection(): Map<NodeId, number> {
    const widths = new Map<NodeId, number>()
    const id = layoutStore.selectedId
    if (id === null) return widths
    const ids = [id, findParent(layoutStore.document, id)?.id]
    for (const target of ids) {
      const width = target === undefined ? null : measureWidth(target)
      if (target !== undefined && width !== null) widths.set(target, width)
    }
    return widths
  }

  /** Первое открытие: отмечен корень выделения, а без выделения — все корни. */
  function initChecked(): void {
    const selected = layoutStore.selectedId
    const rootId = selected === null ? undefined : layoutStore.rootOf(selected)?.node.id
    const all = layoutStore.document.roots.map((entry) => entry.node.id)
    checkedIds.value = new Set(rootId === undefined ? all : [rootId])
    checkedInitialized = true
  }

  watch(
    open,
    (isOpen) => {
      if (!isOpen) return
      scopeKind.value = layoutStore.selectedId === null ? 'all' : 'selected'
      if (!checkedInitialized) initChecked()
      measuredWidths.value = measureSelection()
    },
    { immediate: true },
  )

  const scopeOptions = computed(() =>
    EXPORT_SCOPE_OPTIONS.map((option) => ({ ...option, disabled: option.value === 'selected' && !hasSelection() })),
  )

  /** Есть ли в документе выделенный узел. */
  function hasSelection(): boolean {
    return layoutStore.selectedId !== null
  }

  const rows = computed<ExportRootRow[]>(() =>
    layoutStore.document.roots.map((entry) => ({
      id: entry.node.id,
      label: rootTitle(entry.node),
      width: rootWidthText(entry.canvas),
      checked: checkedIds.value.has(entry.node.id),
    })),
  )

  /** Ставит или снимает отметку корня (набор заменяется целиком ради реактивности). */
  function toggleRoot(id: NodeId, checked: boolean): void {
    const next = new Set(checkedIds.value)
    if (checked) next.add(id)
    else next.delete(id)
    checkedIds.value = next
  }

  const scope = computed<ExportScope | null>(() => {
    if (scopeKind.value === 'all') return { kind: 'all' }
    if (scopeKind.value === 'checked')
      return { kind: 'roots', rootIds: rows.value.filter((r) => r.checked).map((r) => r.id) }
    const nodeId = layoutStore.selectedId
    return nodeId === null ? null : { kind: 'selected', nodeId }
  })

  return { scopeKind, scopeOptions, rows, toggleRoot, scope, measuredWidths }
}
