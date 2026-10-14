/** Глобальные хоткеи страницы canvas; пока только камера (зум, вписывание). */
import { onBeforeUnmount, onMounted } from 'vue'
import { useCameraStore } from './camera-store'
import { isEditableTarget, matchCameraHotkey, type CameraCommand } from './camera-input'

/** Подписывает страницу на хоткеи камеры; в полях ввода хоткеи не срабатывают. */
export function useCanvasHotkeys(): void {
  const cameraStore = useCameraStore()

  /** Экшены стора по командам камеры. */
  const actions: Record<CameraCommand, () => void> = {
    'zoom-in': cameraStore.zoomIn,
    'zoom-out': cameraStore.zoomOut,
    'zoom-reset': cameraStore.resetZoom,
    'fit-all': cameraStore.fitAll,
    'fit-selection': cameraStore.fitSelection,
  }

  /** Сопоставляет клавишу команде; preventDefault блокирует браузерный зум на Ctrl+=/-/0. */
  function onKeyDown(e: KeyboardEvent): void {
    if (e.defaultPrevented) return
    if (e.target instanceof HTMLElement && isEditableTarget(e.target)) return
    const command = matchCameraHotkey(e)
    if (command === null) return
    e.preventDefault()
    actions[command]()
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown)
  })
}
