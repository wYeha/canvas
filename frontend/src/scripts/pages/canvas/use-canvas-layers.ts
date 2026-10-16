/**
 * Composable панели «Слои»: список корней, свёрнутые ветки и действия строк. Состояние сворачивания нужно только
 * этой панели, поэтому живёт здесь и передаётся рекурсивным строкам через provide/inject, а не в Pinia.
 */
import { computed, provide, ref, shallowRef, watch, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import type { NodeId, RootEntry } from '@shared'
import { rootRect } from './camera'
import { useCameraStore } from './camera-store'
import { LAYERS_EMPTY_TEXT, LAYERS_LIST_LABEL } from './constants'
import { expandPath, toggleCollapsed } from './layers'
import { isLayersDropForbidden, layersDropAllowed } from './layers-drop'
import { isLayersDragging, layersDraggingId, layersDropDenied, layersDropOver } from './layers-drag-state'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'
import { findRootEntry, getPath, isDescendant } from './tree-query'
import { useCanvasLayersDnd } from './use-canvas-layers-dnd'

/** Общее для всех строк дерева: свёрнутые ветки и действия. */
export interface CanvasLayersContext {
  /** Id свёрнутых веток; по умолчанию всё раскрыто. */
  collapsed: Readonly<Ref<ReadonlySet<NodeId>>>
  /** Сворачивает или раскрывает ветку. */
  toggle: (id: NodeId) => void
  /** Клик по строке: выделяет узел, корневой блок ещё и ставит по центру экрана. */
  activate: (id: NodeId) => void
}

/** Ключ provide/inject контекста панели «Слои». */
export const CANVAS_LAYERS_CONTEXT: InjectionKey<CanvasLayersContext> = Symbol('canvas-layers')

/** Контекст DnD для строк «Слоёв». */
export interface LayersDndContext {
  /** Строка — источник перетаскивания. */
  isDragSource: (rowId: NodeId) => boolean
  /** Подсветка «внутрь» на разрешённом приёмнике. */
  isDropInside: (rowId: NodeId) => boolean
  /** Строка недоступна (себя или потомок источника). */
  isRowForbidden: (rowId: NodeId) => boolean
}

/** Ключ provide/inject DnD панели «Слои». */
export const LAYERS_DND_CONTEXT: InjectionKey<LayersDndContext> = Symbol('layers-dnd')

/** Результат `useCanvasLayers`. */
export interface CanvasLayersState {
  roots: ComputedRef<readonly RootEntry[]>
  emptyText: string
  listLabel: string
  listEl: Ref<HTMLElement | null>
  panelClasses: ComputedRef<Record<string, boolean>>
}

/**
 * Синхронизирует панель с остальным редактором: выделение и переименование в строке раскрывают свёрнутых предков
 * (иначе строки и поля нет в DOM, а хоткеи ждут конца ввода); выделение, сменившееся не кликом по строке
 * (клавиши, удаление), снова направляет F2 на канвас.
 */
function watchLayersSync(collapsed: Ref<ReadonlySet<NodeId>>): void {
  const layoutStore = useLayoutStore()
  const labelEdit = useLabelEditStore()

  watch(
    () => layoutStore.selectedPath,
    (path) => {
      collapsed.value = expandPath(collapsed.value, path)
    },
  )

  watch(
    () => (labelEdit.place === 'layers' ? labelEdit.editingId : null),
    (id) => {
      if (id !== null) collapsed.value = expandPath(collapsed.value, getPath(layoutStore.document, id))
    },
  )

  watch(
    () => layoutStore.selectedId,
    (id) => {
      if (id !== labelEdit.layersPickId) labelEdit.pickInLayers(null)
    },
  )
}

/** Подключает панель «Слои»: раскрывает путь к выделенному блоку и отдаёт строкам контекст. */
export function useCanvasLayers(): CanvasLayersState {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const labelEdit = useLabelEditStore()
  const collapsed = shallowRef<ReadonlySet<NodeId>>(new Set())
  const listEl = ref<HTMLElement | null>(null)

  /** Корневые блоки документа в порядке `roots`. */
  const roots = computed(() => layoutStore.document.roots)

  watchLayersSync(collapsed)
  useCanvasLayersDnd(listEl)

  /**
   * Сворачивает или раскрывает ветку. Ввод, открытый в строке внутри сворачиваемой ветки, сначала применяется:
   * строка размонтируется, а `blur` при удалении элемента приходит не во всех браузерах.
   */
  function toggle(id: NodeId): void {
    const editing = labelEdit.editingId
    if (editing !== null && labelEdit.place === 'layers' && isDescendant(layoutStore.document, id, editing)) {
      labelEdit.finish()
    }
    collapsed.value = toggleCollapsed(collapsed.value, id)
  }

  /**
   * Выделяет узел (F2 после этого переименовывает в строке); корневой блок ставит по центру видимой области без
   * смены зума. Открытый ввод подписи применяется: кнопки строк не забирают фокус, поэтому `blur` не придёт.
   */
  function activate(id: NodeId): void {
    labelEdit.finish()
    layoutStore.select(id)
    labelEdit.pickInLayers(id)
    const root = findRootEntry(layoutStore.document, id)
    if (root !== undefined) cameraStore.centerWorldRect(rootRect(root, cameraStore.rootHeights))
  }

  provide(CANVAS_LAYERS_CONTEXT, { collapsed, toggle, activate })

  /** Строка — источник перетаскивания в «Слоях». */
  function isDragSource(rowId: NodeId): boolean {
    return isLayersDragging.value && layersDraggingId.value === rowId
  }

  /** Подсветка «внутрь» на разрешённом приёмнике. */
  function isDropInside(rowId: NodeId): boolean {
    const over = layersDropOver.value
    const dragged = layersDraggingId.value
    if (
      !isLayersDragging.value ||
      over === null ||
      dragged === null ||
      over.overId !== rowId ||
      over.zone !== 'inside'
    ) {
      return false
    }
    return layersDropAllowed(layoutStore.document, dragged, rowId, 'inside')
  }

  /** Строка недоступна для отпускания (себя или потомок источника). */
  function isRowForbidden(rowId: NodeId): boolean {
    const dragged = layersDraggingId.value
    return isLayersDragging.value && dragged !== null && isLayersDropForbidden(layoutStore.document, dragged, rowId)
  }

  provide(LAYERS_DND_CONTEXT, { isDragSource, isDropInside, isRowForbidden })

  /** Модификаторы панели во время перетаскивания. */
  const panelClasses = computed(() => ({
    'canvas-layers--dragging': isLayersDragging.value,
    'canvas-layers--drop-denied': layersDropDenied.value,
  }))

  return {
    roots,
    emptyText: LAYERS_EMPTY_TEXT,
    listLabel: LAYERS_LIST_LABEL,
    listEl,
    panelClasses,
  }
}
