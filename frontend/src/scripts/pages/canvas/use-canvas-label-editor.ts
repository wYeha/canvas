/**
 * Composable поля ввода подписи на канвасе: положение поля в экранных координатах оверлея (берётся из DOM блока
 * и пересчитывается при смене камеры и документа), фокус при открытии, Enter / blur применяют, Esc — автоподпись
 * (при создании) или откат (при переименовании).
 */
import { nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCameraStore } from './camera-store'
import { clientRectOf, findNodeElement } from './node-dom'
import { labelEditKeyAction, labelEditorRect } from './label-editor'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'
import { useViewSettingsStore } from './view-settings-store'
import { overlayRectStyle, toLocalRect } from './selection'
import { findNode } from './tree-query'

/** Возвращает refs оверлея и поля, стиль положения (или `null`, если ввода нет) и обработчики клавиш и потери фокуса. */
export function useCanvasLabelEditor() {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const viewSettings = useViewSettingsStore()
  const labelEdit = useLabelEditStore()
  const { document: doc } = storeToRefs(layoutStore)
  const { camera, rootHeights } = storeToRefs(cameraStore)
  const { editingId, draft, place } = storeToRefs(labelEdit)
  /** Элемент оверлея: его положение на странице — начало экранных координат. */
  const overlayEl = ref<HTMLElement | null>(null)
  /** Поле ввода. */
  const inputEl = ref<HTMLInputElement | null>(null)
  /** Стиль положения поля; `null`, пока ввода нет. */
  const style = ref<Record<string, string> | null>(null)

  /** Пересчитывает положение поля по DOM блока; если блок исчез из документа, ввод закрывается. */
  function recompute(): void {
    const id = editingId.value
    if (id !== null && findNode(doc.value, id) === undefined) {
      labelEdit.finish()
      style.value = null
      return
    }
    const origin = overlayEl.value?.getBoundingClientRect()
    // Переименование в строке «Слоёв» рисует своё поле, на канвасе поля нет
    const el = id === null || place.value !== 'canvas' ? null : findNodeElement(id)
    if (id === null || origin === undefined || el === null) {
      style.value = null
      return
    }
    const local = toLocalRect(clientRectOf(el), { x: origin.left, y: origin.top, width: 0, height: 0 })
    style.value = overlayRectStyle(labelEditorRect(local))
  }

  /** Фокусирует поле после того, как оно отрисовано. */
  async function focusInput(): Promise<void> {
    await nextTick()
    inputEl.value?.focus()
    // При переименовании текущая подпись выделена целиком: можно сразу печатать новую
    if (labelEdit.mode === 'rename') inputEl.value?.select()
  }

  // Живое зеркало меняет раскладку без смены документа
  watch([camera, doc, rootHeights, () => viewSettings.linksMirrored], recompute, { flush: 'post' })
  watch(
    editingId,
    () => {
      recompute()
      void focusInput()
    },
    { flush: 'post' },
  )

  /** Enter применяет подпись, Esc отказывается от ввода (автоподпись при создании, откат при переименовании). */
  function onKeydown(e: KeyboardEvent): void {
    const action = labelEditKeyAction(e)
    if (action === null) return
    e.preventDefault()
    labelEdit[action]()
  }

  /** Потеря фокуса применяет подпись; если ввод уже закрыт клавишей, ничего не делает. */
  function onBlur(): void {
    labelEdit.finish()
  }

  return { overlayEl, inputEl, style, draft, onKeydown, onBlur }
}
