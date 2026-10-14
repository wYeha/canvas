/** Логика фрагмента UiKitInputs: значения полей витрины, чтобы v-model было видно в работе. */
import { ref, type Ref } from 'vue'

/** Начальный текст демонстрационного текстового поля. */
const INITIAL_TEXT = 'Блок-1'
/** Начальное число демонстрационного числового поля. */
const INITIAL_NUMBER = 16

/** Возвращает реактивные значения полей витрины: текстовое, числовое и числовое с пустым значением. */
export function useUiKitInputs(): {
  text: Ref<string>
  number: Ref<number | null>
  emptyNumber: Ref<number | null>
} {
  const text = ref(INITIAL_TEXT)
  const number = ref<number | null>(INITIAL_NUMBER)
  const emptyNumber = ref<number | null>(null)
  return { text, number, emptyNumber }
}
