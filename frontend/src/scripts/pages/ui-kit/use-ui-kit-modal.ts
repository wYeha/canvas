/** Логика фрагмента UiKitModal: флаги открытия модалок витрины. */
import { ref, type Ref } from 'vue'

/** Возвращает флаги открытия большой и компактной модалок. */
export function useUiKitModal(): { exportOpen: Ref<boolean>; compactOpen: Ref<boolean> } {
  return { exportOpen: ref(false), compactOpen: ref(false) }
}
