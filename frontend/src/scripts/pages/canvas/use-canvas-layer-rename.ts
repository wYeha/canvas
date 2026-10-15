/**
 * Composable переименования в строке панели «Слои» (двойной клик или F2): поле — общий `UiTextInput`,
 * черновик и завершение — в `label-edit-store`, клавиши поля — `labelEditKeyAction`, как у поля на канвасе.
 */
import { computed, nextTick, onMounted, watch, type ComputedRef, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import type { LayoutNode } from '@shared'
import { LABEL_EDITOR_ARIA } from './constants'
import { useLabelEditStore } from './label-edit-store'
import { labelEditKeyAction } from './label-editor'
import { focusInputIn } from './node-dom'

/** Результат `useCanvasLayerRename`. */
export interface CanvasLayerRenameState {
  renaming: ComputedRef<boolean>
  draft: Ref<string>
  renameLabel: string
  startRename: () => void
  onRenameKeydown: (e: KeyboardEvent) => void
  onRenameBlur: () => void
}

/** Подключает переименование строки узла `node()`; `rowEl` — строка, внутри которой рисуется поле. */
export function useCanvasLayerRename(node: () => LayoutNode, rowEl: Ref<HTMLElement | null>): CanvasLayerRenameState {
  const labelEdit = useLabelEditStore()
  const { draft } = storeToRefs(labelEdit)

  /** Открыто ли переименование этой строки в «Слоях». */
  const renaming = computed(() => labelEdit.editingId === node().id && labelEdit.place === 'layers')

  /** Фокусирует поле после отрисовки и выделяет текст целиком: можно сразу печатать новую подпись. */
  async function focusIfRenaming(): Promise<void> {
    if (!renaming.value) return
    await nextTick()
    focusInputIn(rowEl.value)
  }

  // Строка могла смонтироваться уже в режиме ввода (раскрылась ветка ради редактируемого узла) — тогда onMounted
  watch(renaming, () => void focusIfRenaming())
  onMounted(() => void focusIfRenaming())

  /** Двойной клик по строке: переименование блока прямо в строке; у связи подписи нет. */
  function startRename(): void {
    const target = node()
    if (target.type !== 'block') return
    labelEdit.beginRename(target.id, target.label, 'layers')
  }

  /** Enter применяет подпись, Esc откатывает (пустое значение тоже откат). */
  function onRenameKeydown(e: KeyboardEvent): void {
    const action = labelEditKeyAction(e)
    if (action === null) return
    e.preventDefault()
    labelEdit[action]()
  }

  /** Потеря фокуса применяет подпись. */
  function onRenameBlur(): void {
    labelEdit.finish()
  }

  return { renaming, draft, renameLabel: LABEL_EDITOR_ARIA, startRename, onRenameKeydown, onRenameBlur }
}
