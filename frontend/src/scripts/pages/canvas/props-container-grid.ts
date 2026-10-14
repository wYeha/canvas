/** Чистая логика grid-части секции «Контейнер»: пресеты колонок, нормализация шаблонов, связка отступов. Без Vue. */
import { GRID_ALIGN_VALUES, type GridContainer } from '@shared'
import type { UiChipOption } from '@/scripts/components/ui-chips/ui-chips.types'
import type { UiSegmentedOption } from '@/scripts/components/ui-segmented/ui-segmented.types'
import { normalizeCssSpaces, parseCssValue } from '@/scripts/globals/css-value'
import { GRID_ROWS_DEFAULT } from './constants'

/** Какой из двух отступов изменили. */
export type GridGapKey = 'columnGap' | 'rowGap'

/** Пресеты `grid-template-columns`: подпись на чипе и CSS-значение. */
export const GRID_COLUMN_PRESETS: readonly UiChipOption[] = [
  { value: 'repeat(2, 1fr)', label: '1fr ×2' },
  { value: 'repeat(3, 1fr)', label: '×3' },
  { value: 'repeat(4, 1fr)', label: '×4' },
  { value: '250px 1fr', label: '250px 1fr' },
  { value: 'repeat(auto-fill, minmax(200px, 1fr))', label: 'auto-fill' },
]

/** Сегменты `justify-items` / `align-items` grid: слова. */
export const GRID_ALIGN_OPTIONS: readonly UiSegmentedOption[] = GRID_ALIGN_VALUES.map((value) => ({
  value,
  label: value,
}))

/** Сужает строку до значения выравнивания grid; чужое — `null`. */
export function asGridAlign(value: string | null): GridContainer['alignItems'] | null {
  return GRID_ALIGN_VALUES.find((item) => item === value) ?? null
}

/** Нормализует `grid-template-columns`: пусто или небезопасно — `null` (откат). */
export function normalizeColumns(value: string): string | null {
  const parsed = parseCssValue(value, false)
  return parsed === '' ? null : parsed
}

/** Нормализует поле `grid-template-rows`: пусто и `auto` дают пустую строку (по умолчанию); небезопасное — `null`. */
export function normalizeRows(value: string): string | null {
  const parsed = parseCssValue(value, true)
  return parsed === GRID_ROWS_DEFAULT ? '' : parsed
}

/** Значение для документа из поля строк: пустое поле — `auto`. */
export function rowsFromField(field: string): string {
  return field === '' ? GRID_ROWS_DEFAULT : field
}

/** Значение пресета колонок, совпавшее с текущим после нормализации пробелов; иначе `null`. */
export function activeColumnPreset(columns: string): string | null {
  const current = normalizeCssSpaces(columns)
  return GRID_COLUMN_PRESETS.find((preset) => normalizeCssSpaces(preset.value) === current)?.value ?? null
}

/** Строки показываем пустым полем, если стоит значение по умолчанию (`auto`). */
export function rowsToField(rows: string): string {
  return normalizeCssSpaces(rows) === GRID_ROWS_DEFAULT ? '' : rows
}

/** Связка включена, если отступы равны (в том числе оба не заданы). */
export function initialGapLinked(container: Pick<GridContainer, 'columnGap' | 'rowGap'>): boolean {
  return container.columnGap === container.rowGap
}

/** Изменение отступа: при включённой связке второй отступ повторяет первый. */
export function gapPatch(
  key: GridGapKey,
  value: number | null,
  linked: boolean,
): Partial<Pick<GridContainer, GridGapKey>> {
  return linked ? { columnGap: value, rowGap: value } : { [key]: value }
}
