/** Глобальные хоткеи страницы canvas: камера (зум, вписывание), навигация по выделению (Esc, Enter) и создание блоков (F, G), редактирование (Del, Ctrl+D, Alt+↑/↓, F2, Ctrl+C/V) и история (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y). */
import { onBeforeUnmount, onMounted } from 'vue'
import { useCameraStore } from './camera-store'
import {
  isEditableTarget,
  isInteractiveTarget,
  matchCameraHotkey,
  isRepeatableEdit,
  matchCreateHotkey,
  matchEditHotkey,
  matchExportHotkey,
  matchHistoryHotkey,
  matchSelectionHotkey,
  type CameraCommand,
  type EditCommand,
} from './camera-input'
import { useDragStore } from './dnd/drag-store'
import { isLayersDragging } from './layers-drag-state'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'
import { useCanvasClipboard } from './use-canvas-clipboard'
import { useCanvasPropsActions } from './use-canvas-props-actions'
import { useCanvasCreate } from './use-canvas-create'
import { useCanvasHistory } from './use-canvas-history'
import { layerIdFromTarget, measureNodeWorldRect } from './node-dom'
import { firstChildSelection, parentSelection } from './selection'

/** Зависимости хоткеев страницы: открытие окна экспорта и признак «хоткеи сейчас заблокированы» (открыто окно). */
export interface CanvasHotkeysOptions {
  openExport: () => void
  isBlocked: () => boolean
}

/** Подписывает страницу на хоткеи камеры, выделения, создания блоков (F, G) и экспорта (Ctrl+E); в полях ввода и при открытом окне хоткеи не срабатывают. */
export function useCanvasHotkeys({ openExport, isBlocked }: CanvasHotkeysOptions): void {
  const cameraStore = useCameraStore()
  const layoutStore = useLayoutStore()
  const labelEdit = useLabelEditStore()
  const dragStore = useDragStore()
  const { createBlock } = useCanvasCreate()
  const { run } = useCanvasPropsActions()
  const { copySelected, pasteClipboard, renameSelected } = useCanvasClipboard()
  const history = useCanvasHistory()

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

  /** Есть ли на странице выделенный текст: тогда Ctrl+C копирует его, а не блок. */
  function hasTextSelection(): boolean {
    return (window.getSelection()?.toString() ?? '') !== ''
  }

  /** Выполняет команду редактирования общей с кнопками логикой; `true`, если событие обработано (нужен preventDefault). */
  function runEdit(command: EditCommand, target: EventTarget | null): boolean {
    if (command === 'copy') return !hasTextSelection() && copySelected()
    if (command === 'paste') return pasteClipboard()
    if (command === 'rename') return renameSelected(layerIdFromTarget(target) !== null)
    // Ctrl+D всегда перехватываем: иначе браузер добавит закладку
    if (layoutStore.selectedId === null) return command === 'duplicate'
    run(command)
    return true
  }

  /** Del, Ctrl+D, Alt+↑/↓, F2, Ctrl+C/V; `true`, если клавиша распознана и обработана. Удержание не повторяет опасные действия. */
  function handleEditKey(e: KeyboardEvent): boolean {
    const command = matchEditHotkey(e)
    if (command === null) return false
    if (e.repeat && !isRepeatableEdit(command)) {
      e.preventDefault()
      return true
    }
    if (!runEdit(command, e.target)) return false
    e.preventDefault()
    return true
  }

  /** Сужает цель события до полей, нужных проверкам интерактивности. */
  function describeTarget(t: HTMLElement) {
    return { tagName: t.tagName, isContentEditable: t.isContentEditable, role: t.getAttribute('role') }
  }

  /** Ctrl+Z — отменить, Ctrl+Shift+Z / Ctrl+Y — повторить (удержание повторяет); `true`, если клавиша распознана. */
  function handleHistoryKey(e: KeyboardEvent): boolean {
    const command = matchHistoryHotkey(e)
    if (command === null) return false
    // preventDefault: Ctrl+Y в части браузеров открывает историю, Ctrl+Z не должен уйти в нативную отмену
    e.preventDefault()
    history[command]()
    return true
  }

  /** Сопоставляет клавишу команде; preventDefault блокирует браузерный зум на Ctrl+=/-/0. */
  function onKeyDown(e: KeyboardEvent): void {
    // Пока открыт ввод подписи, клавиши канваса не работают (фокус и так в поле, это страховка на момент до фокуса).
    // Во время перетаскивания тоже: удаление или отмена посреди жеста убрали бы перетаскиваемый блок (Esc ловит DnD).
    if (
      isBlocked() ||
      e.defaultPrevented ||
      labelEdit.editingId !== null ||
      dragStore.isDragging ||
      isLayersDragging.value
    )
      return
    if (e.target instanceof HTMLElement && isEditableTarget(e.target)) return
    if (matchExportHotkey(e)) {
      // preventDefault: иначе Chrome по Ctrl+E фокусирует строку поиска
      e.preventDefault()
      openExport()
      return
    }
    if (handleHistoryKey(e)) return
    const kind = matchCreateHotkey(e)
    if (kind !== null) {
      e.preventDefault()
      // Удержание клавиши не плодит блоки
      if (!e.repeat) createBlock(kind)
      return
    }
    if (handleEditKey(e)) return
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
