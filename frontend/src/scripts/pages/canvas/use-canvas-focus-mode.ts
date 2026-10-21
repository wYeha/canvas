/**
 * Composable режима фокуса на поле (16.7): выходит из режима, когда блок в фокусе пропал (удалён, отменён) или открыт
 * другой документ — иначе затемнение осталось бы без «окна». Вход — двойной клик (use-canvas-select), выход — Esc
 * (use-canvas-hotkeys) или клик мимо поддерева.
 */
import { watch } from 'vue'
import { useFocusModeStore } from './focus-mode-store'
import { useLayoutStore } from './layout-store'
import { findNode } from './tree-query'

/** Следит за документом и сбрасывает фокус на пропавшем блоке или при смене документа. */
export function useCanvasFocusMode(): void {
  const layoutStore = useLayoutStore()
  const focusMode = useFocusModeStore()

  watch(
    () => layoutStore.document,
    (doc, previous) => {
      const id = focusMode.focusId
      if (id === null) return
      if (doc.id !== previous.id || findNode(doc, id) === undefined) focusMode.exit()
    },
  )
}
