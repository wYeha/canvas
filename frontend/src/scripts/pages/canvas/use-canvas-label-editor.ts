/**
 * Composable поля ввода подписи на канвасе: положение поля в экранных координатах оверлея (берётся из DOM блока
 * и пересчитывается при смене камеры и документа), фокус при открытии, Enter / blur применяют, Esc — автоподпись.
 */
import { nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useCameraStore } from './camera-store'
import { clientRectOf, findNodeElement } from './node-dom'
import { labelEditorRect } from './label-editor'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'
import { overlayRectStyle, toLocalRect } from './selection'
import { findNode } from './tree-query'
import { ENTER_CODE, ESCAPE_CODE, NUMPAD_ENTER_CODE } from './constants'

/** Возвращает refs оверлея и поля, стиль положения (или `null`, если ввода нет) и обработчики клавиш и потери фокуса. */
export function useCanvasLabelEditor() {
  const layoutStore = useLayoutStore()
  const cameraStore = useCameraStore()
  const labelEdit = useLabelEditStore()
  const { document: doc } = storeToRefs(layoutStore)
  const { camera, rootHeights } = storeToRefs(cameraStore)
  const { editingId, draft } = storeToRefs(labelEdit)
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
    const el = id === null ? null : findNodeElement(id)
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
  }

  watch([camera, doc, rootHeights], recompute, { flush: 'post' })
  watch(
    editingId,
    () => {
      recompute()
      void focusInput()
    },
    { flush: 'post' },
  )

  /** Enter применяет подпись, Esc отказывается от ввода (автоподпись). */
  function onKeydown(e: KeyboardEvent): void {
    // Enter внутри композиции IME подтверждает символы, а не подпись
    if (e.isComposing) return
    if (e.code === ENTER_CODE || e.code === NUMPAD_ENTER_CODE) {
      e.preventDefault()
      labelEdit.finish()
    } else if (e.code === ESCAPE_CODE) {
      e.preventDefault()
      labelEdit.cancel()
    }
  }

  /** Потеря фокуса применяет подпись; если ввод уже закрыт клавишей, ничего не делает. */
  function onBlur(): void {
    labelEdit.finish()
  }

  return { overlayEl, inputEl, style, draft, onKeydown, onBlur }
}
