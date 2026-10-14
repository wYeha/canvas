/**
 * Pinia-хранилище камеры канваса: положение и зум, размер viewport и замеры высот корней.
 * Экшены — тонкие обёртки над `camera.ts`; DOM и localStorage не трогаем (камеру с документом сохранит 5.4).
 */
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { NodeId } from '@shared'
import {
  areaCenter,
  fitRect,
  formatZoom,
  nextZoomStep,
  panBy as panCamera,
  prevZoomStep,
  rootsBounds,
  safeArea,
  zoomAt,
  type Camera,
  type Rect,
  type Size,
} from './camera'
import { CANVAS_SAFE_INSETS, DEFAULT_CAMERA, FIT_ALL_MAX_ZOOM, FIT_PADDING } from './constants'
import type { CanvasPoint } from './factories'
import { useLayoutStore } from './layout-store'

export const useCameraStore = defineStore('camera', () => {
  /** Текущая камера. */
  const camera = ref<Camera>({ ...DEFAULT_CAMERA })
  /** Размер viewport, экранные px; `{0,0}`, пока не измерен. */
  const viewportSize = ref<Size>({ width: 0, height: 0 })
  /** Замеренные высоты корней в координатах поля (наполняет 1.7). */
  const rootHeights = ref<Map<NodeId, number>>(new Map())

  /** Подпись зума в процентах. */
  const zoomLabel = computed<string>(() => formatZoom(camera.value.zoom))

  /** Видимая область viewport без плавающих панелей. */
  const visibleArea = computed<Rect>(() => safeArea(viewportSize.value, CANVAS_SAFE_INSETS))

  /** Запоминает размер viewport. */
  function setViewportSize(size: Size): void {
    viewportSize.value = { width: size.width, height: size.height }
  }

  /** Запоминает замеренную высоту корня. */
  function setRootHeight(id: NodeId, height: number): void {
    rootHeights.value = new Map(rootHeights.value).set(id, height)
  }

  /** Забывает замер высоты корня. */
  function removeRootHeight(id: NodeId): void {
    if (!rootHeights.value.has(id)) return
    const next = new Map(rootHeights.value)
    next.delete(id)
    rootHeights.value = next
  }

  /** Сдвигает поле на `dx, dy` экранных px. */
  function panBy(dx: number, dy: number): void {
    camera.value = panCamera(camera.value, dx, dy)
  }

  /** Меняет зум, удерживая точку поля под экранным `anchor`. */
  function zoomAtPoint(anchor: CanvasPoint, nextZoom: number): void {
    camera.value = zoomAt(camera.value, anchor, nextZoom)
  }

  /** Следующая ступень зума к центру видимой области. */
  function zoomIn(): void {
    zoomAtPoint(areaCenter(visibleArea.value), nextZoomStep(camera.value.zoom))
  }

  /** Предыдущая ступень зума к центру видимой области. */
  function zoomOut(): void {
    zoomAtPoint(areaCenter(visibleArea.value), prevZoomStep(camera.value.zoom))
  }

  /** Зум 100% к центру видимой области. */
  function resetZoom(): void {
    zoomAtPoint(areaCenter(visibleArea.value), DEFAULT_CAMERA.zoom)
  }

  /** Вписывает все корни в видимую область (не больше 100%); пустой документ — начальная камера. */
  function fitAll(): void {
    const bounds = rootsBounds(useLayoutStore().document.roots, rootHeights.value)
    if (bounds === null) {
      camera.value = { ...DEFAULT_CAMERA }
      return
    }
    const next = fitRect(bounds, visibleArea.value, FIT_PADDING, FIT_ALL_MAX_ZOOM)
    if (next !== null) camera.value = next
  }

  /** Вписывает выделенный блок; пока ничего не делает. */
  function fitSelection(): void {
    // TODO(1.10): вписать выделенный блок (fitRect с ZOOM_MAX), когда на канвасе появятся измерения блоков
  }

  return {
    camera,
    viewportSize,
    rootHeights,
    zoomLabel,
    visibleArea,
    setViewportSize,
    setRootHeight,
    removeRootHeight,
    panBy,
    zoomAtPoint,
    zoomIn,
    zoomOut,
    resetZoom,
    fitAll,
    fitSelection,
  }
})
