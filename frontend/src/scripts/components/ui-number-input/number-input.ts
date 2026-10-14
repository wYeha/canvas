/** Чистая логика UiNumberInput: разбор текста, форматирование, шаг стрелками и фиксация правки. */

/** Множитель шага при зажатом Shift. */
export const SHIFT_STEP_MULTIPLIER = 10

/** Шаг по умолчанию. */
export const DEFAULT_STEP = 1

/** Допустимый текст числа: необязательный минус, цифры, необязательная дробная часть через точку или запятую. */
const NUMBER_PATTERN = /^-?(\d+([.,]\d*)?|[.,]\d+)$/

/** Результат разбора текста поля. */
export type ParsedNumber = { kind: 'empty' } | { kind: 'number'; value: number } | { kind: 'invalid' }

/** Результат фиксации правки: итоговое значение модели и текст для поля. */
export interface CommitResult {
  value: number | null
  text: string
}

/** Отбрасывает единицу поля в конце текста (с пробелом или без); чужая единица остаётся и делает текст нечислом. */
function stripUnit(text: string, unit?: string): string {
  if (!unit || !text.toLowerCase().endsWith(unit.toLowerCase())) return text
  return text.slice(0, text.length - unit.length).trim()
}

/** Разбирает текст поля: пустая строка, число (запятая допустима, единица поля отбрасывается) или нечисло. */
export function parseNumberText(text: string, unit?: string): ParsedNumber {
  const original = text.trim()
  const trimmed = stripUnit(original, unit)
  if (original === '') return { kind: 'empty' }
  // Одна единица без числа — не пустое значение, а ошибка ввода
  if (trimmed === '') return { kind: 'invalid' }
  if (!NUMBER_PATTERN.test(trimmed)) return { kind: 'invalid' }
  const value = Number(trimmed.replace(',', '.'))
  return Number.isFinite(value) ? { kind: 'number', value } : { kind: 'invalid' }
}

/** Ограничивает значение диапазоном; границы необязательны. */
export function clampNumber(value: number, min?: number, max?: number): number {
  let result = value
  if (max !== undefined) result = Math.min(result, max)
  if (min !== undefined) result = Math.max(result, min)
  return result
}

/** Форматирует значение модели для поля: null — пустая строка. */
export function formatNumber(value: number | null): string {
  return value === null ? '' : String(value)
}

/** Считает знаки после точки в числе (для округления без ошибок плавающей точки). */
function decimalsOf(value: number): number {
  return String(value).split('.')[1]?.length ?? 0
}

/** Делает шаг от текущего значения (null считается нулём), с округлением и ограничением по min/max. */
export function stepNumber(
  current: number | null,
  direction: 1 | -1,
  step: number,
  shift: boolean,
  min?: number,
  max?: number,
): number {
  const base = current ?? 0
  const delta = direction * step * (shift ? SHIFT_STEP_MULTIPLIER : 1)
  const precision = Math.max(decimalsOf(step), decimalsOf(base))
  return clampNumber(Number((base + delta).toFixed(precision)), min, max)
}

/**
 * Фиксирует правку: пусто → null, число → значение с ограничением по min/max,
 * нечисло → откат к последнему корректному значению (fallback).
 * При `nullable = false` пусто тоже откатывается к fallback: обязательное поле не остаётся пустым.
 */
export function resolveCommit(
  text: string,
  fallback: number | null,
  min?: number,
  max?: number,
  unit?: string,
  nullable = true,
): CommitResult {
  const parsed = parseNumberText(text, unit)
  if (parsed.kind === 'empty' && nullable) return { value: null, text: '' }
  const value = parsed.kind === 'number' ? clampNumber(parsed.value, min, max) : fallback
  return { value, text: formatNumber(value) }
}
