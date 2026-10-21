/** Состояние страницы canvas, не нужное другим фрагментам: открыто ли окна экспорта и горячих клавиш. */
import { ref, type Ref } from 'vue'
import { useTextDraftStore } from './text-draft-store'

/** Результат `useCanvasPage`. */
export interface CanvasPageState {
  /** Открыто ли окно экспорта (v-model:open модалки). */
  exportOpen: Ref<boolean>
  /** Открывает окно экспорта (кнопка в хедере и Ctrl+E). */
  openExport: () => void
  /** Открыто ли окно горячих клавиш (v-model:open модалки). */
  hotkeysOpen: Ref<boolean>
  /** Открывает окно горячих клавиш (кнопка «?» в хедере и клавиша `?`). */
  openHotkeys: () => void
  /** Хоткеи канваса заблокированы: открыто окно экспорта или горячих клавиш. */
  isBlocked: () => boolean
}

/** Состояние страницы: флаги окон экспорта и горячих клавиш и команды их открытия. */
export function useCanvasPage(): CanvasPageState {
  const exportOpen = ref(false)
  const hotkeysOpen = ref(false)
  const drafts = useTextDraftStore()

  /** Открывает окно экспорта; незаписанный ввод полей «Свойств» сначала попадает в документ. */
  function openExport(): void {
    drafts.flushAll()
    exportOpen.value = true
  }

  /** Открывает окно горячих клавиш. */
  function openHotkeys(): void {
    hotkeysOpen.value = true
  }

  /** Блокирует хоткеи канваса, пока открыто любое окно. */
  function isBlocked(): boolean {
    return exportOpen.value || hotkeysOpen.value
  }

  return { exportOpen, openExport, hotkeysOpen, openHotkeys, isBlocked }
}
