/**
 * Composable строки панели «Слои»: вид строки (значок, подпись, тип, классы), сворачивание, клик и переименование.
 * Выделенная строка прокручивается в видимую часть панели — и при выделении на канвасе, и после раскрытия ветки.
 * Состояния строки — отдельные computed: смена ховера или выделения пересчитывает только затронутые строки.
 */
import { computed, inject, onMounted, watch, type ComputedRef, type Ref } from 'vue'
import type { LayoutNode } from '@shared'
import type { CanvasLayerItemProps } from './canvas-layer-item.types'
import {
  layerCaption,
  layerChevronClasses,
  layerIcon,
  layerRowClasses,
  layerToggleLabel,
  type LayerIcon,
} from './layers'
import { useLayoutStore } from './layout-store'
import { scrollIntoViewIfHidden } from './node-dom'
import { repeatMark } from './node-view'
import { nodeTypeLabel } from './selection'
import { CANVAS_LAYERS_CONTEXT, LAYERS_DND_CONTEXT, type CanvasLayersContext } from './use-canvas-layers'
import { skipLayersClickAfterDrag } from './use-canvas-layers-dnd'
import { useCanvasLayerRename, type CanvasLayerRenameState } from './use-canvas-layer-rename'

/** Вид строки слоя для шаблона. */
export interface LayerItemView {
  rowClasses: string[]
  chevronClasses: string[]
  icon: LayerIcon
  caption: string
  /** Знак повтора `×N` после подписи; без повтора — пусто. */
  repeat: string
  type: string
  /** `true` или `undefined`: `aria-current` ставится только выделенной строке. */
  current: true | undefined
  expandable: boolean
  expanded: boolean
  toggleLabel: string
  renaming: boolean
  children: readonly LayoutNode[]
}

/** Результат `useCanvasLayerItem`: вид, действия строки и переименование. */
export interface CanvasLayerItemState extends Omit<CanvasLayerRenameState, 'renaming'> {
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

/** Собирает вид строки; `rowEl` — ref строки для прокрутки к выделенной и для поля переименования. */
export function useCanvasLayerItem(props: CanvasLayerItemProps, rowEl: Ref<HTMLElement | null>): CanvasLayerItemState {
  const context = injectLayersContext()
  const dnd = inject(LAYERS_DND_CONTEXT, null)
  const store = useLayoutStore()
  const { renaming, ...rename } = useCanvasLayerRename(() => props.node, rowEl)

  /** Выделена ли строка. */
  const selected = computed(() => store.selectedId === props.node.id)
  /** Под курсором ли блок строки (на канвасе или в «Слоях»). */
  const hovered = computed(() => store.hoveredId === props.node.id)
  /** Дети строки. */
  const children = computed(() => props.node.children)
  /** Раскрыта ли ветка: есть дети и она не свёрнута. */
  const expanded = computed(() => children.value.length > 0 && !context.collapsed.value.has(props.node.id))
  /** Подпись строки. */
  const caption = computed(() => layerCaption(props.node))

  /** Вид строки: всё, что нужно шаблону. */
  const view = computed<LayerItemView>(() => {
    const { node, depth } = props
    const state = {
      root: depth === 0,
      selected: selected.value,
      hovered: hovered.value,
      dragSource: dnd?.isDragSource(node.id) ?? false,
      dropInside: dnd?.isDropInside(node.id) ?? false,
      dropForbidden: dnd?.isRowForbidden(node.id) ?? false,
    }
    return {
      rowClasses: layerRowClasses(state),
      chevronClasses: layerChevronClasses(expanded.value),
      icon: layerIcon(node),
      caption: caption.value,
      repeat: depth === 0 ? '' : repeatMark(node),
      type: nodeTypeLabel(node),
      current: selected.value || undefined,
      expandable: children.value.length > 0,
      expanded: expanded.value,
      toggleLabel: layerToggleLabel(expanded.value),
      renaming: renaming.value,
      children: children.value,
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
    if (skipLayersClickAfterDrag()) return
    context.activate(props.node.id)
  }

  return { view, ...rename, toggle, activate }
}
