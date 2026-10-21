/** Composable фрагмента CanvasZoom: подпись зума, кнопки −, +, «вписать всё», переключатели подписей, зеркала, стрелок связей и «Пропорции / Структура». */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCameraStore } from './camera-store'
import {
  ARROWS_ALL_TITLE,
  ARROWS_SELECTED_TITLE,
  LABELS_HIDE_TITLE,
  LABELS_SHOW_TITLE,
  MIRROR_HIDE_TITLE,
  MIRROR_SHOW_TITLE,
  SIZES_PROPORTIONS_TITLE,
  SIZES_STRUCTURE_TITLE,
} from './constants'
import { useViewSettingsStore } from './view-settings-store'

/** Отдаёт плашке зума подпись процента, экшены камеры и состояние переключателя подписей. */
export function useCanvasZoom() {
  const cameraStore = useCameraStore()
  const viewSettings = useViewSettingsStore()
  const { zoomLabel } = storeToRefs(cameraStore)
  const { labelsVisible, linksMirrored, linkArrowsAll, sizesShown } = storeToRefs(viewSettings)
  /** Подсказка переключателя: что случится по нажатию. */
  const labelsToggleTitle = computed(() => (labelsVisible.value ? LABELS_HIDE_TITLE : LABELS_SHOW_TITLE))

  /** Подсказка переключателя зеркала: что случится по нажатию. */
  const mirrorToggleTitle = computed(() => (linksMirrored.value ? MIRROR_HIDE_TITLE : MIRROR_SHOW_TITLE))

  /** Подсказка переключателя стрелок: что случится по нажатию. */
  const arrowsToggleTitle = computed(() => (linkArrowsAll.value ? ARROWS_SELECTED_TITLE : ARROWS_ALL_TITLE))

  /** Подсказка переключателя «Пропорции / Структура»: что случится по нажатию. */
  const sizesToggleTitle = computed(() => (sizesShown.value ? SIZES_STRUCTURE_TITLE : SIZES_PROPORTIONS_TITLE))

  /** Переключает превью «Пропорции / Структура». */
  function toggleSizes(): void {
    viewSettings.toggleSizesShown()
  }

  /** Переключает «все стрелки связей / у выделенных». */
  function toggleArrows(): void {
    viewSettings.toggleLinkArrowsAll()
  }

  /** Переключает живое зеркало связей. */
  function toggleMirror(): void {
    viewSettings.toggleLinksMirrored()
  }

  /** Переключает показ подписей на канвасе. */
  function toggleLabels(): void {
    viewSettings.toggleLabels()
  }

  return {
    zoomLabel,
    labelsVisible,
    labelsToggleTitle,
    toggleLabels,
    linksMirrored,
    mirrorToggleTitle,
    toggleMirror,
    linkArrowsAll,
    arrowsToggleTitle,
    toggleArrows,
    sizesShown,
    sizesToggleTitle,
    toggleSizes,
    zoomIn: cameraStore.zoomIn,
    zoomOut: cameraStore.zoomOut,
    fitAll: cameraStore.fitAll,
  }
}
