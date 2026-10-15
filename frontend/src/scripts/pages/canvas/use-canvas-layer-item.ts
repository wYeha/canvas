/**
 * Composable строки панели «Слои»: вид строки (значок, подпись, тип, классы), сворачивание, клик и переименование
 * в строке (двойной клик или F2; поле — общий `UiTextInput`, черновик и завершение — в `label-edit-store`).
 * Выделенная строка прокручивается в видимую часть панели — и при выделении на канвасе, и после раскрытия ветки.
 */
import { computed, inject, nextTick, onMounted, watch, type ComputedRef, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
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
import { LABEL_EDITOR_ARIA } from './constants'
import { useLabelEditStore } from './label-edit-store'
import { labelEditKeyAction } from './label-editor'
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
  renaming: boolean
  children: readonly LayoutNode[]
}

/** Результат `useCanvasLayerItem`. */
export interface CanvasLayerItemState {
  view: ComputedRef<LayerItemView>
  draft: Ref<string>
  renameLabel: string
  toggle: () => void
  activate: () => void
  startRename: () => void
  onRenameKeydown: (e: KeyboardEvent) => void
  onRenameBlur: () => void
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
  const labelEdit = useLabelEditStore()
  const { draft } = storeToRefs(labelEdit)

  /** Открыто ли переименование этой строки в «Слоях». */
  const renaming = computed(() => labelEdit.editingId === props.node.id && labelEdit.place === 'layers')

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
      renaming: renaming.value,
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

  /** Фокусирует поле переименования и выделяет текст целиком: можно сразу печатать новую подпись. */
  async function focusRenameInput(): Promise<void> {
    await nextTick()
    const input = rowEl.value?.querySelector('input')
    input?.focus()
    input?.select()
  }

  watch(renaming, (on) => {
    if (on) void focusRenameInput()
  })

  /** Сворачивает или раскрывает ветку строки. */
  function toggle(): void {
    context.toggle(props.node.id)
  }

  /** Клик по строке: выделение, у корня — ещё и центрирование. */
  function activate(): void {
    context.activate(props.node.id)
  }

  /** Двойной клик по строке: переименование блока прямо в строке; у связи подписи нет. */
  function startRename(): void {
    const { node } = props
    if (node.type !== 'block') return
    labelEdit.beginRename(node.id, node.label, 'layers')
  }

  /** Enter применяет подпись, Esc откатывает (пустое значение тоже откат). */
  function onRenameKeydown(e: KeyboardEvent): void {
    const action = labelEditKeyAction(e)
    if (action === null) return
    e.preventDefault()
    labelEdit[action]()
  }

  /** Клик мимо поля применяет подпись. */
  function onRenameBlur(): void {
    labelEdit.finish()
  }

  return {
    view,
    draft,
    renameLabel: LABEL_EDITOR_ARIA,
    toggle,
    activate,
    startRename,
    onRenameKeydown,
    onRenameBlur,
  }
}
