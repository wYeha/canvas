/** Composable сворачивания секций панели свойств: состояние по id хранится в localStorage. */
import { ref } from 'vue'
import { PROPS_SECTIONS_STORAGE_KEY } from '@/scripts/globals/constants'
import { getStorageItem, setStorageItem } from '@/scripts/globals/storage'
import { isSectionOpen, parseSectionsState, withSectionOpen, type PropsSectionId } from './props-sections'

/** Возвращает проверку «секция раскрыта» и установку состояния с записью в localStorage. */
export function useCanvasPropsSections() {
  const state = ref(parseSectionsState(getStorageItem(PROPS_SECTIONS_STORAGE_KEY)))

  /** Раскрыта ли секция (по умолчанию да). */
  function isOpen(id: PropsSectionId): boolean {
    return isSectionOpen(state.value, id)
  }

  /** Запоминает состояние секции; недоступное хранилище не мешает работе в текущей сессии. */
  function setOpen(id: PropsSectionId, open: boolean): void {
    state.value = withSectionOpen(state.value, id, open)
    setStorageItem(PROPS_SECTIONS_STORAGE_KEY, JSON.stringify(state.value))
  }

  return { isOpen, setOpen }
}
