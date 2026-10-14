/** Глобальные хоткеи страницы canvas: камера (зум, вписывание) и навигация по выделению (Esc, Enter). */
import { onBeforeUnmount, onMounted } from 'vue'
import { useCameraStore } from './camera-store'
import {
  isEditableTarget,
  isInteractiveTarget,
  matchCameraHotkey,
  matchExportHotkey,
  matchSelectionHotkey,
  type CameraCommand,
} from './camera-input'
import { useLayoutStore } from './layout-store'
import { measureNodeWorldRect } from './node-dom'
import { firstChildSelection, parentSelection } from './selection'

/** Зависимости хоткеев страницы: открытие окна экспорта и признак «хоткеи сейчас заблокированы» (открыто окно). */
export interface CanvasHotkeysOptions {
  openExport: () => void
  isBlocked: () => boolean
}

/** Подписывает страницу на хоткеи камеры, выделения и экспорта (Ctrl+E); в полях ввода и при открытом окне хоткеи не срабатывают. */
export function useCanvasHotkeys({ openExport, isBlocked }: CanvasHotkeysOptions): void {
  const cameraStore = useCameraStore()
  const layoutStore = useLayoutStore()

  /** Вписывает выделенный блок: прямоугольник берётся из DOM в координатах поля. */
  function fitSelection(): void {
    const id = layoutStore.selectedId
    if (id === null) return
    const rect = measureNodeWorldRect(id, cameraStore.camera.zoom)
    if (rect !== null) cameraStore.fitWorldRect(rect)
  }

  /** Экшены по командам камеры. */
  const actions: Record<CameraCommand, () => void> = {
    'zoom-in': cameraStore.zoomIn,
    'zoom-out': cameraStore.zoomOut,
    'zoom-reset': cameraStore.resetZoom,
    'fit-all': cameraStore.fitAll,
    'fit-selection': fitSelection,
  }

  /** Esc и Enter: перемещают выделение; без выделения ничего не делают, Enter на кнопках и ссылках не забираем. */
  function handleSelectionKey(e: KeyboardEvent): void {
    const command = matchSelectionHotkey(e)
    const id = layoutStore.selectedId
    if (command === null || id === null) return
    const target = e.target
    // Enter на кнопке нажимает её; Esc кнопкам не нужен, поэтому работает и с фокусом на кнопке.
    if (command === 'select-child' && target instanceof HTMLElement && isInteractiveTarget(describeTarget(target)))
      return
    e.preventDefault()
    const doc = layoutStore.document
    layoutStore.select(command === 'select-parent' ? parentSelection(doc, id) : firstChildSelection(doc, id))
  }

  /** Сужает цель события до полей, нужных проверкам интерактивности. */
  function describeTarget(t: HTMLElement) {
    return { tagName: t.tagName, isContentEditable: t.isContentEditable, role: t.getAttribute('role') }
  }

  /** Сопоставляет клавишу команде; preventDefault блокирует браузерный зум на Ctrl+=/-/0. */
  function onKeyDown(e: KeyboardEvent): void {
    if (isBlocked() || e.defaultPrevented) return
    if (e.target instanceof HTMLElement && isEditableTarget(e.target)) return
    if (matchExportHotkey(e)) {
      // preventDefault: иначе Chrome по Ctrl+E фокусирует строку поиска
      e.preventDefault()
      openExport()
      return
    }
    const command = matchCameraHotkey(e)
    if (command === null) {
      handleSelectionKey(e)
      return
    }
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
