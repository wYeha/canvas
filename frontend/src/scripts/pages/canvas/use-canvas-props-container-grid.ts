/** Composable grid-части секции «Контейнер»: шаблоны колонок и строк через черновик, выравнивание. */
import { computed, type ComputedRef, type WritableComputedRef } from 'vue'
import type { BlockNode, GridContainer, NodeId } from '@shared'
import { useLayoutStore } from './layout-store'
import {
  activeColumnPreset,
  asGridAlign,
  normalizeColumns,
  normalizeRows,
  rowsFromField,
  rowsToField,
} from './props-container-grid'
import { findNode } from './tree-query'
import { useBlockTextDraft } from './use-block-text-draft'

/** Возвращает grid-поля выделенного блока; у flex-блока `grid` равен `null`. */
export function useCanvasPropsContainerGrid(block: ComputedRef<BlockNode | null>) {
  const layoutStore = useLayoutStore()

  /** Grid-контейнер выделенного блока; у flex — `null`. */
  const grid = computed<GridContainer | null>(() =>
    block.value?.container.kind === 'grid' ? block.value.container : null,
  )

  /** Правит grid-поля блока по id; у не-grid блока ничего не делает. */
  function patchGrid(id: NodeId, change: Partial<Omit<GridContainer, 'kind'>>): void {
    const node = findNode(layoutStore.document, id)
    if (node?.container.kind === 'grid') {
      layoutStore.updateNode(id, { container: { ...node.container, ...change } })
    }
  }

  const columns = useBlockTextDraft(
    () => (block.value && grid.value ? { id: block.value.id, value: grid.value.columns } : null),
    { multiline: false, normalize: normalizeColumns },
    (id, columns) => {
      patchGrid(id, { columns })
    },
  )
  const rows = useBlockTextDraft(
    () => (block.value && grid.value ? { id: block.value.id, value: rowsToField(grid.value.rows) } : null),
    { multiline: false, normalize: normalizeRows },
    (id, field) => {
      patchGrid(id, { rows: rowsFromField(field) })
    },
  )

  /** Активный пресет колонок по текущему значению документа. */
  const columnsPreset: WritableComputedRef<string | null> = computed({
    /** Читает совпавший пресет. */
    get: () => (grid.value ? activeColumnPreset(grid.value.columns) : null),
    /** Применяет пресет сразу в документ. */
    set: (value) => {
      if (block.value && value !== null) patchGrid(block.value.id, { columns: value })
    },
  })

  /** Перечислимое поле выравнивания grid: чтение и запись только допустимых значений. */
  function alignField(key: 'justifyItems' | 'alignItems'): WritableComputedRef<string | null> {
    return computed({
      /** Читает значение из документа. */
      get: () => grid.value?.[key] ?? null,
      /** Пишет значение, если оно из перечисления. */
      set: (value) => {
        const next = asGridAlign(value)
        if (block.value && next !== null) patchGrid(block.value.id, { [key]: next })
      },
    })
  }

  return {
    grid,
    columns: columns.draft,
    columnsError: columns.error,
    applyColumns: columns.apply,
    onColumnsKeydown: columns.onKeydown,
    columnsPreset,
    rows: rows.draft,
    rowsError: rows.error,
    applyRows: rows.apply,
    onRowsKeydown: rows.onKeydown,
    justifyItems: alignField('justifyItems'),
    alignItems: alignField('alignItems'),
  }
}
