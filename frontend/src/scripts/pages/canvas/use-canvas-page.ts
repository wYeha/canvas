/** Состояние страницы canvas, не нужное другим фрагментам: открыто ли окно экспорта. */
import { ref, type Ref } from 'vue'

/** Результат `useCanvasPage`. */
export interface CanvasPageState {
  /** Открыто ли окно экспорта (v-model:open модалки). */
  exportOpen: Ref<boolean>
  /** Открывает окно экспорта (кнопка в хедере и Ctrl+E). */
  openExport: () => void
  /** Хоткеи канваса заблокированы: открыто окно экспорта. */
  isBlocked: () => boolean
}

/** Состояние страницы: флаг окна экспорта и команда его открытия. */
export function useCanvasPage(): CanvasPageState {
  const exportOpen = ref(false)

  /** Открывает окно экспорта. */
  function openExport(): void {
    exportOpen.value = true
  }

  /** Блокирует хоткеи канваса, пока открыто окно. */
  function isBlocked(): boolean {
    return exportOpen.value
  }

  return { exportOpen, openExport, isBlocked }
}
