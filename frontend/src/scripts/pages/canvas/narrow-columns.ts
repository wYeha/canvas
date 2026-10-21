/**
 * Чистая логика «колонок на узких экранах» grid-контейнера (15.5): разбор поля (`2 → 1`, `2 1`, `2,1`), показ и
 * текст намерения для экспорта. Шаги строго убывают и меньше текущего числа колонок. Без Vue и Pinia.
 */
import { NARROW_COLUMNS_MAX, NARROW_STEPS_MAX, type GridContainer } from '@shared'
import { NARROW_ARROW, NARROW_INTENT_PREFIX } from './constants'
import { countGridColumns } from './props-child'

/** Допустимые символы поля: цифры и разделители (пробел, запятая, стрелки `→`, `->`, `>`). */
const NARROW_FIELD_PATTERN = /^[\d\s,→>-]*$/

/** Числа в поле. */
const NUMBER_PATTERN = /\d+/g

/** Строго убывают ли шаги и лежат ли в 1…`NARROW_COLUMNS_MAX`. */
function isDescending(steps: readonly number[]): boolean {
  return steps.every((step, index) => {
    const previous = steps[index - 1]
    return step >= 1 && step <= NARROW_COLUMNS_MAX && (previous === undefined || step < previous)
  })
}

/** Шаги из поля: пусто — `[]` (стереть), недопустимое — `null` (ошибка поля). */
export function parseNarrowColumns(value: string): number[] | null {
  if (!NARROW_FIELD_PATTERN.test(value)) return null
  const steps = (value.match(NUMBER_PATTERN) ?? []).map(Number)
  if (steps.length > NARROW_STEPS_MAX) return null
  return isDescending(steps) ? steps : null
}

/** Шаги для поля: `2 → 1`; без шагов — пустая строка. */
export function formatNarrowColumns(steps: readonly number[] | undefined): string {
  return (steps ?? []).join(` ${NARROW_ARROW} `)
}

/** Нормализация поля для черновика: тот же текст в каноническом виде или `null` при ошибке. */
export function normalizeNarrowColumns(value: string): string | null {
  const steps = parseNarrowColumns(value)
  return steps === null ? null : formatNarrowColumns(steps)
}

/**
 * Намерение для комментария экспорта: `колонки на узких экранах: 3 → 2 → 1` — с текущим числом колонок впереди, если
 * оно известно и больше первого шага. Без шагов — `null`.
 */
export function narrowColumnsIntent(grid: GridContainer): string | null {
  const steps = grid.narrowColumns ?? []
  const [first] = steps
  if (first === undefined) return null
  const current = countGridColumns(grid.columns)
  const all = current !== null && current > first ? [current, ...steps] : steps
  return `${NARROW_INTENT_PREFIX}${formatNarrowColumns(all)}`
}
