/**
 * Composable строки панели «Слои»: вид строки (значок, подпись, тип, классы), сворачивание и клик.
 * Выделенная строка прокручивается в видимую часть панели — и при выделении на канвасе, и после раскрытия ветки.
 */
import { computed, inject, onMounted, watch, type ComputedRef, type Ref } from 'vue'
import type { LayoutNode } from '@shared'
import type { CanvasLayerItemProps } from './canvas-layer-item.types'
import {
  layerCaption,
  layerChevronClasses,
  layerChildren,
  layerIcon,
  layerRowClasses,
  layerToggleLabel,
  type LayerIcon,
} from './layers'
import { useLayoutStore } from './layout-store'
import { scrollIntoViewIfHidden } from './node-dom'
import { nodeTypeLabel } from './selection'
import { CANVAS_LAYERS_CONTEXT, type CanvasLayersContext } from './use-canvas-layers'

/** Вид строки слоя для шаблона. */
export interface LayerItemView {
  rowClasses: string[]
  chevronClasses: string[]
  icon: LayerIcon
  caption: string
  type: string
  selected: boolean
  expandable: boolean
  expanded: boolean
  toggleLabel: string
  children: readonly LayoutNode[]
}

/** Результат `useCanvasLayerItem`. */
export interface CanvasLayerItemState {
  view: ComputedRef<LayerItemView>
  toggle: () => void
  activate: () => void
}

/** Контекст панели «Слои»; строка вне панели — ошибка разработчика. */
function injectLayersContext(): CanvasLayersContext {
  const context = inject(CANVAS_LAYERS_CONTEXT)
  if (context === undefined) throw new Error('CanvasLayerItem используется вне панели «Слои»')
  return context
}

/** Собирает вид строки; `rowEl` — ref строки для прокрутки к выделенной. */
export function useCanvasLayerItem(props: CanvasLayerItemProps, rowEl: Ref<HTMLElement | null>): CanvasLayerItemState {
  const context = injectLayersContext()
  const store = useLayoutStore()

  /** Выделена ли строка. */
  const selected = computed(() => store.selectedId === props.node.id)

  /** Вид строки: всё, что нужно шаблону. */
  const view = computed<LayerItemView>(() => {
    const { node, depth } = props
    const children = layerChildren(node)
    const expandable = children.length > 0
    const expanded = expandable && !context.collapsed.value.has(node.id)
    const state = { root: depth === 0, selected: selected.value, hovered: store.hoveredId === node.id }
    return {
      rowClasses: layerRowClasses(state),
      chevronClasses: layerChevronClasses(expanded),
      icon: layerIcon(node),
      caption: layerCaption(node, store.rootLabelMap),
      type: nodeTypeLabel(node),
      selected: selected.value,
      expandable,
      expanded,
      toggleLabel: layerToggleLabel(expanded),
      children,
    }
  })

  /** Прокручивает строку в видимую часть панели, если она выделена. */
  function revealIfSelected(): void {
    if (selected.value && rowEl.value !== null) scrollIntoViewIfHidden(rowEl.value)
  }

  // Строка, выделенная на канвасе, могла только что появиться (раскрылась ветка) — тогда сработает onMounted
  watch(selected, revealIfSelected, { flush: 'post' })
  onMounted(revealIfSelected)

  /** Сворачивает или раскрывает ветку строки. */
  function toggle(): void {
    context.toggle(props.node.id)
  }

  /** Клик по строке: выделение, у корня — ещё и центрирование. */
  function activate(): void {
    context.activate(props.node.id)
  }

  return { view, toggle, activate }
}
