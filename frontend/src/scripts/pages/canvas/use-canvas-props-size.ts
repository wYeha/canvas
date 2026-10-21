/** Composable фрагмента CanvasPropsSize: значение сегментов (строка) ↔ режим размера, чужие строки отбрасываются. */
import { computed, type ModelRef, type WritableComputedRef } from 'vue'
import { CHILD_SIZE_MODE_OPTIONS } from './constants'
import type { SizeMode } from './size-mode'

/** Сужает строку сегмента до режима размера; чужая — `null`. */
export function asSizeMode(value: string | null): SizeMode | null {
  return CHILD_SIZE_MODE_OPTIONS.find((option) => option.value === value)?.value ?? null
}

/** Значение для сегментов поверх модели режима. */
export function useCanvasPropsSize(mode: ModelRef<SizeMode | null>): { segment: WritableComputedRef<string | null> } {
  const segment = computed<string | null>({
    /** Текущий режим. */
    get: () => mode.value,
    /** Новый режим из сегментов; чужая строка игнорируется. */
    set: (value) => {
      const next = asSizeMode(value)
      if (next !== null) mode.value = next
    },
  })
  return { segment }
}
