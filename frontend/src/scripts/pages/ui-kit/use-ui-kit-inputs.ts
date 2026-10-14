/** Логика фрагмента UiKitInputs: значения полей витрины, чтобы v-model было видно в работе. */
import { ref, type Ref } from 'vue'

/** Начальный текст демонстрационного текстового поля. */
const INITIAL_TEXT = 'Блок-1'
/** Начальное число демонстрационного числового поля. */
const INITIAL_NUMBER = 16

/** Возвращает реактивные значения полей витрины: текстовое, многострочное, числовое, числовое с пустым значением и состояние переключателя. */
export function useUiKitInputs(): {
  text: Ref<string>
  area: Ref<string>
  number: Ref<number | null>
  emptyNumber: Ref<number | null>
  enabled: Ref<boolean>
} {
  const text = ref(INITIAL_TEXT)
  const area = ref('')
  const number = ref<number | null>(INITIAL_NUMBER)
  const emptyNumber = ref<number | null>(null)
  const enabled = ref(true)
  return { text, area, number, emptyNumber, enabled }
}
