/**
 * Composable панели «Слои»: список корней, свёрнутые ветки и действия строк. Состояние сворачивания нужно только
 * этой панели, поэтому живёт здесь и передаётся рекурсивным строкам через provide/inject, а не в Pinia.
 */
import { computed, provide, shallowRef, watch, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import type { NodeId, RootEntry } from '@shared'
import { rootRect } from './camera'
import { useCameraStore } from './camera-store'
import { LAYERS_EMPTY_TEXT, LAYERS_LIST_LABEL } from './constants'
import { expandPath, toggleCollapsed } from './layers'
import { useLayoutStore } from './layout-store'
import { findRootEntry } from './tree-query'

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

/** Результат `useCanvasLayers`. */
export interface CanvasLayersState {
  roots: ComputedRef<readonly RootEntry[]>
  emptyText: string
  listLabel: string
}

/** Подключает панель «Слои»: раскрывает путь к выделенному блоку и отдаёт строкам контекст. */
export function useCanvasLayers(): CanvasLayersState {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const collapsed = shallowRef<ReadonlySet<NodeId>>(new Set())

  /** Корневые блоки документа в порядке `roots`. */
  const roots = computed(() => layoutStore.document.roots)

  // Выделение с канваса раскрывает свёрнутых предков, чтобы строка выделенного блока была видна
  watch(
    () => layoutStore.selectedPath,
    (path) => {
      collapsed.value = expandPath(collapsed.value, path)
    },
  )

  /** Сворачивает или раскрывает ветку. */
  function toggle(id: NodeId): void {
    collapsed.value = toggleCollapsed(collapsed.value, id)
  }

  /** Выделяет узел; корневой блок ставит по центру видимой области без смены зума. */
  function activate(id: NodeId): void {
    layoutStore.select(id)
    const root = findRootEntry(layoutStore.document, id)
    if (root !== undefined) cameraStore.centerWorldRect(rootRect(root, cameraStore.rootHeights))
  }

  provide(CANVAS_LAYERS_CONTEXT, { collapsed, toggle, activate })

  return { roots, emptyText: LAYERS_EMPTY_TEXT, listLabel: LAYERS_LIST_LABEL }
}
