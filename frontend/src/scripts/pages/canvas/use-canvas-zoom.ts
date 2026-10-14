/** Composable фрагмента CanvasZoom: подпись зума и кнопки −, +, «вписать всё». */
import { storeToRefs } from 'pinia'
import { useCameraStore } from './camera-store'

/** Отдаёт плашке зума подпись процента и экшены камеры. */
export function useCanvasZoom() {
  const cameraStore = useCameraStore()
  const { zoomLabel } = storeToRefs(cameraStore)
  return { zoomLabel, zoomIn: cameraStore.zoomIn, zoomOut: cameraStore.zoomOut, fitAll: cameraStore.fitAll }
}
