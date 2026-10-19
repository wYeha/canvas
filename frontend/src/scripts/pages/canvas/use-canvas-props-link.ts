/**
 * Логика фрагмента CanvasPropsLink: имя источника выделенной связи, переход к нему, ширины «источник / место»
 * (место — замер плашки на поле после перерисовки) и «Подогнать» (ширина превью источника = месту).
 */
import { computed, nextTick, onMounted, shallowRef, watch, type ComputedRef } from 'vue'
import { isLinkBlock } from '@shared'
import { useCameraStore } from './camera-store'
import { useLayoutStore } from './layout-store'
import { linkWidthState, type LinkWidthState } from './link-width'
import { measureNodeWorldRect } from './node-dom'
import { findRootEntry } from './tree-query'
import { linkSourceName } from './node-view'
import { useCanvasLinkNav } from './use-canvas-link-nav'

/** Состояние секции «Связь». */
export interface CanvasPropsLinkState {
  /** Имя источника выделенной связи; `null`, если выделена не связь. */
  source: ComputedRef<string | null>
  /** Переходит к источнику выделенной связи. */
  goToSource: () => void
  /** Ширины источника и места; `null`, если выделена не связь или источника нет. */
  widths: ComputedRef<LinkWidthState | null>
  /** Ставит ширину превью источника равной месту. */
  fitSource: () => void
}

/** Возвращает имя источника выделенной связи и переход к нему. */
export function useCanvasPropsLink(): CanvasPropsLinkState {
  const layoutStore = useLayoutStore()
  const linkNav = useCanvasLinkNav()
  const cameraStore = useCameraStore()
  /** Ширина плашки выделенной связи на поле (px поля); `null` — не связь или не отрисована. */
  const placeWidth = shallowRef<number | null>(null)

  const source = computed(() => {
    const node = layoutStore.selectedNode
    return node !== undefined && isLinkBlock(node) ? linkSourceName(node.sourceId, layoutStore.rootLabels) : null
  })

  /** Выделяет источник и показывает его в центре поля. */
  function goToSource(): void {
    const node = layoutStore.selectedNode
    if (node !== undefined) linkNav.goToSource(node.id)
  }

  /** Замеряет плашку выделенной связи (первую, без копий повтора). */
  function measurePlace(): void {
    const node = layoutStore.selectedNode
    const rect = node !== undefined && isLinkBlock(node) ? measureNodeWorldRect(node.id, cameraStore.camera.zoom) : null
    placeWidth.value = rect === null ? null : rect.width
  }

  // После перерисовки: выделение, документ (в том числе ширина корня), высоты корней и зум меняют замер
  watch(
    [
      () => layoutStore.selectedId,
      () => layoutStore.document,
      () => cameraStore.rootHeights,
      () => cameraStore.camera.zoom,
    ],
    measurePlace,
    { flush: 'post' },
  )
  onMounted(() => {
    void nextTick(measurePlace)
  })

  const widths = computed<LinkWidthState | null>(() => {
    const node = layoutStore.selectedNode
    if (node === undefined || !isLinkBlock(node)) return null
    const entry = findRootEntry(layoutStore.document, node.sourceId)
    return entry === undefined ? null : linkWidthState(entry.canvas.width, placeWidth.value)
  })

  /** Подгоняет ширину превью источника под место выделенной связи (один шаг истории). */
  function fitSource(): void {
    const node = layoutStore.selectedNode
    const width = widths.value?.fitTo ?? null
    if (node === undefined || !isLinkBlock(node) || width === null) return
    layoutStore.updateRootPlacement(node.sourceId, { width })
  }

  return { source, goToSource, widths, fitSource }
}
