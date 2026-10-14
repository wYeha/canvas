/** Общая проверка и нормализация пользовательских CSS-значений (шаблоны grid и т.п.): значение не должно выходить за пределы декларации. */

/** Символы, которые не могут входить в безопасное значение: разрывают декларацию, правило или разметку. */
const UNSAFE_CSS_CHARS = [';', '"', '<', '>', '{', '}'] as const

/** Схлопывает пробельные символы в один пробел и обрезает края: `'  1fr   2fr '` → `'1fr 2fr'`. */
export function normalizeCssSpaces(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/** Значение безопасно: нет запрещённых символов (`; " < > { }`). Пустая строка безопасна. */
export function isSafeCssValue(value: string): boolean {
  return !UNSAFE_CSS_CHARS.some((char) => value.includes(char))
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
