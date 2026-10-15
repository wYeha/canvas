/** Composable отмены и повтора для кнопок тулбара и хоткеев: перед шагом истории завершает открытый ввод подписи. */
import { computed } from 'vue'
import { useLabelEditStore } from './label-edit-store'
import { useLayoutStore } from './layout-store'

/** Возвращает `undo()`, `redo()` и флаги доступности `canUndo` / `canRedo`. */
export function useCanvasHistory() {
  const layoutStore = useLayoutStore()
  const labelEdit = useLabelEditStore()

  const canUndo = computed(() => layoutStore.canUndo)
  const canRedo = computed(() => layoutStore.canRedo)

  /**
   * Отменяет последний шаг. Кнопки тулбара не забирают фокус, поэтому ввод подписи может быть открыт:
   * сначала он применяется (подпись склеивается с созданием блока), и отмена убирает блок целиком.
   */
  function undo(): void {
    labelEdit.finish()
    layoutStore.undo()
  }

  /** Повторяет отменённый шаг; открытый ввод подписи сначала применяется (и сам очистит повтор, если что-то записал). */
  function redo(): void {
    labelEdit.finish()
    layoutStore.redo()
  }

  return { canUndo, canRedo, undo, redo }
}
