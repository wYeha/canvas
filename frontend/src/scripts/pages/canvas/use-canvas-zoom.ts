/** Composable фрагмента CanvasZoom: подпись зума, кнопки −, +, «вписать всё» и переключатель подписей. */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useCameraStore } from './camera-store'
import { LABELS_HIDE_TITLE, LABELS_SHOW_TITLE } from './constants'
import { useViewSettingsStore } from './view-settings-store'

/** Отдаёт плашке зума подпись процента, экшены камеры и состояние переключателя подписей. */
export function useCanvasZoom() {
  const cameraStore = useCameraStore()
  const viewSettings = useViewSettingsStore()
  const { zoomLabel } = storeToRefs(cameraStore)
  const { labelsVisible } = storeToRefs(viewSettings)
  /** Подсказка переключателя: что случится по нажатию. */
  const labelsToggleTitle = computed(() => (labelsVisible.value ? LABELS_HIDE_TITLE : LABELS_SHOW_TITLE))

  /** Переключает показ подписей на канвасе. */
  function toggleLabels(): void {
    viewSettings.toggleLabels()
  }

  return {
    zoomLabel,
    labelsVisible,
    labelsToggleTitle,
    toggleLabels,
    zoomIn: cameraStore.zoomIn,
    zoomOut: cameraStore.zoomOut,
    fitAll: cameraStore.fitAll,
  }
}
