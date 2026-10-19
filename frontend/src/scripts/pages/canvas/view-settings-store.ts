/**
 * Pinia-хранилище настроек редактора (не документа): сейчас только «показывать подписи блоков».
 * Нужно нескольким фрагментам — плашке зума (кнопка) и полю (модификатор). Значение запоминается в localStorage.
 */
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { LABELS_VISIBLE_STORAGE_KEY } from '@/scripts/globals/constants'
import { getStorageItem, setStorageItem } from '@/scripts/globals/storage'
import { parseLabelsVisible, serializeLabelsVisible } from './view-settings'

export const useViewSettingsStore = defineStore('view-settings', () => {
  /** Показаны ли чипы подписей и подписи пустых листов (по умолчанию да). */
  const labelsVisible = ref(parseLabelsVisible(getStorageItem(LABELS_VISIBLE_STORAGE_KEY)))

  /** Переключает показ подписей и запоминает выбор; недоступное хранилище не мешает работе в текущей сессии. */
  function toggleLabels(): void {
    labelsVisible.value = !labelsVisible.value
    setStorageItem(LABELS_VISIBLE_STORAGE_KEY, serializeLabelsVisible(labelsVisible.value))
  }

  return { labelsVisible, toggleLabels }
})
