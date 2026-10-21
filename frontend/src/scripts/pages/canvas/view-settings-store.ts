/**
 * Pinia-хранилище настроек редактора (не документа): «показывать подписи блоков», «живое зеркало связей» и
 * «все стрелки связей».
 * Нужно нескольким фрагментам — плашке зума (кнопки), полю и блокам. Значения запоминаются в localStorage.
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  LABELS_VISIBLE_STORAGE_KEY,
  LINK_ARROWS_ALL_STORAGE_KEY,
  LINKS_MIRRORED_STORAGE_KEY,
} from '@/scripts/globals/constants'
import { getStorageItem, setStorageItem } from '@/scripts/globals/storage'
import { parseLabelsVisible, parseOptInFlag, serializeFlag } from './view-settings'

export const useViewSettingsStore = defineStore('view-settings', () => {
  /** Показаны ли чипы подписей и подписи пустых листов (по умолчанию да). */
  const labelsVisible = ref(parseLabelsVisible(getStorageItem(LABELS_VISIBLE_STORAGE_KEY)))

  /** Переключает показ подписей и запоминает выбор; недоступное хранилище не мешает работе в текущей сессии. */
  function toggleLabels(): void {
    labelsVisible.value = !labelsVisible.value
    setStorageItem(LABELS_VISIBLE_STORAGE_KEY, serializeFlag(labelsVisible.value))
  }

  /** Живое зеркало: на месте связи рисуется содержимое источника, а не плашка (по умолчанию нет). */
  const linksMirrored = ref(parseOptInFlag(getStorageItem(LINKS_MIRRORED_STORAGE_KEY)))

  /** Переключает живое зеркало связей и запоминает выбор. */
  function toggleLinksMirrored(): void {
    linksMirrored.value = !linksMirrored.value
    setStorageItem(LINKS_MIRRORED_STORAGE_KEY, serializeFlag(linksMirrored.value))
  }

  /** Стрелки всех связей; по умолчанию — только у выделенной связи и её источника (иначе на поле паутина). */
  const linkArrowsAll = ref(parseOptInFlag(getStorageItem(LINK_ARROWS_ALL_STORAGE_KEY)))

  /** Переключает «все стрелки / у выделенных» и запоминает выбор. */
  function toggleLinkArrowsAll(): void {
    linkArrowsAll.value = !linkArrowsAll.value
    setStorageItem(LINK_ARROWS_ALL_STORAGE_KEY, serializeFlag(linkArrowsAll.value))
  }

  return { labelsVisible, toggleLabels, linksMirrored, toggleLinksMirrored, linkArrowsAll, toggleLinkArrowsAll }
})
