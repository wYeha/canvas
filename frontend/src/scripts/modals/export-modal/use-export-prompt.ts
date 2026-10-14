/** Состояние шаблона промпта экспорта: чтение и запись в localStorage, сброс к умолчанию. */
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { EXPORT_PROMPT_STORAGE_KEY } from '@/scripts/globals/constants'
import { getStorageItem, removeStorageItem, setStorageItem } from '@/scripts/globals/storage'
import { DEFAULT_EXPORT_PROMPT, resolvePrompt } from '@/scripts/pages/canvas/export/export-prompt'

/** Результат `useExportPrompt`. */
export interface ExportPromptState {
  /** Текст шаблона (редактируется через v-model). */
  prompt: Ref<string>
  /** Совпадает ли текст с умолчанием. */
  isDefault: ComputedRef<boolean>
  /** Не удалось ли сохранить шаблон в localStorage. */
  saveFailed: Ref<boolean>
  /** Сбрасывает шаблон к умолчанию и удаляет сохранённое значение. */
  reset: () => void
}

/** Шаблон промпта: читает сохранённое значение при создании, пишет на каждое изменение. */
export function useExportPrompt(): ExportPromptState {
  const prompt = ref(resolvePrompt(getStorageItem(EXPORT_PROMPT_STORAGE_KEY)))
  const saveFailed = ref(false)
  const isDefault = computed(() => prompt.value === DEFAULT_EXPORT_PROMPT)
  let resetting = false

  watch(prompt, (value) => {
    // Сброс сам удаляет ключ: умолчание не записываем, чтобы будущие правки умолчания доходили до пользователя
    if (resetting) {
      resetting = false
      return
    }
    saveFailed.value = !setStorageItem(EXPORT_PROMPT_STORAGE_KEY, value)
  })

  /** Сбрасывает шаблон к умолчанию и удаляет ключ. */
  function reset(): void {
    saveFailed.value = !removeStorageItem(EXPORT_PROMPT_STORAGE_KEY)
    if (prompt.value !== DEFAULT_EXPORT_PROMPT) resetting = true
    prompt.value = DEFAULT_EXPORT_PROMPT
  }

  return { prompt, isDefault, saveFailed, reset }
}
