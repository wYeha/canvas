/** Общая проверка и нормализация пользовательских CSS-значений (шаблоны grid, размеры): значение не должно выходить за пределы декларации. */

/** Символы и последовательности, которые не могут входить в безопасное значение: разрывают декларацию, правило, строку, комментарий или разметку. */
const UNSAFE_CSS_TOKENS = [';', '"', "'", '\\', '&', '<', '>', '{', '}', '/*', '*/'] as const

/** Парные скобки: закрывающая → открывающая. */
const CLOSING_TO_OPENING: Readonly<Record<string, string>> = { ')': '(', ']': '[' }

/** Сообщение об ошибке для zod-схем и UI. */
export const UNSAFE_CSS_MESSAGE =
  'Недопустимое CSS-значение: нельзя ; " \' \\ & < > { } и комментарии, скобки () и [] должны быть парными'

/** Схлопывает пробельные символы в один пробел и обрезает края: `'  1fr   2fr '` → `'1fr 2fr'`. */
export function normalizeCssSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/** Скобки `()` и `[]` закрыты и вложены правильно (`calc(100%` и `)(` — нет). */
function hasBalancedBrackets(value: string): boolean {
  const stack: string[] = []
  for (const char of value) {
    if (char === '(' || char === '[') {
      stack.push(char)
    } else if (char in CLOSING_TO_OPENING && stack.pop() !== CLOSING_TO_OPENING[char]) {
      return false
    }
  }
  return stack.length === 0
}

/** Значение безопасно: нет запрещённых символов и последовательностей (точка с запятой, кавычки, обратный слэш, амперсанд, угловые и фигурные скобки, начало и конец комментария), скобки сбалансированы. Пустая строка безопасна. */
export function isSafeCssValue(value: string): boolean {
  return !UNSAFE_CSS_TOKENS.some((token) => value.includes(token)) && hasBalancedBrackets(value)
}

/**
 * Проверяет значение и возвращает нормализованную строку; `null` — значение недопустимо.
 * Пустая строка допустима только при `allowEmpty` (тогда результат — пустая строка).
 */
export function parseCssValue(value: string, allowEmpty: boolean): string | null {
  const normalized = normalizeCssSpaces(value)
  if (normalized === '') return allowEmpty ? '' : null
  return isSafeCssValue(normalized) ? normalized : null
}
