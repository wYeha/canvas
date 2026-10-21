/**
 * Чистая логика режимов размера «как ребёнок» (этап 14): по содержимому, заполнить, фиксированный — по каждой оси.
 * Заданное число без режима — фиксированный (так значения старых документов читаются без миграции). Без Vue и Pinia.
 */
import type { FlexContainer, SelfProps } from '@shared'
import { CSS_DEFAULT_FLEX, SIZE_MARK_GLYPHS } from './constants'

/** Ось размера. */
export type SizeAxis = 'width' | 'height'

/** Режим размера по оси для UI и стилей. */
export type SizeMode = 'content' | 'fill' | 'fixed'

/** Поля `self` для режима и числа по оси. */
const AXIS_FIELDS = {
  width: { mode: 'widthMode', value: 'width' },
  height: { mode: 'heightMode', value: 'height' },
} as const

/** Число размера по оси (обрезанное); пустое — `null`. */
export function sizeValue(self: SelfProps, axis: SizeAxis): string | null {
  const value = self[AXIS_FIELDS[axis].value]?.trim() ?? ''
  return value === '' ? null : value
}

/** Режим размера по оси: заданный явно, иначе фиксированный при заданном числе, иначе по содержимому. */
export function sizeMode(self: SelfProps, axis: SizeAxis): SizeMode {
  const mode = self[AXIS_FIELDS[axis].mode]
  if (mode !== undefined) return mode
  return sizeValue(self, axis) === null ? 'content' : 'fixed'
}

/** Главная ось flex-контейнера: у row и row-reverse — ширина, у column — высота. */
export function mainAxis(direction: FlexContainer['direction']): SizeAxis {
  return direction === 'row' || direction === 'row-reverse' ? 'width' : 'height'
}

/** Другая ось. */
export function otherAxis(axis: SizeAxis): SizeAxis {
  return axis === 'width' ? 'height' : 'width'
}

/** `self` без ключей (возвращает копию; вход не меняется). */
function without(self: SelfProps, keys: readonly (keyof SelfProps)[]): SelfProps {
  const next: SelfProps = { ...self }
  for (const key of keys) Reflect.deleteProperty(next, key)
  return next
}

/**
 * Новый `self` с режимом по оси. По содержимому — без режима и числа; заполнить — без числа, а по главной оси
 * flex-родителя (`isMain`) свободный `flex` сбрасывается к умолчанию (иначе он перекрыл бы режим); фиксированный —
 * режим, число сохраняется.
 */
export function withSizeMode(self: SelfProps, axis: SizeAxis, mode: SizeMode, isMain: boolean): SelfProps {
  const fields = AXIS_FIELDS[axis]
  if (mode === 'content') return without(self, [fields.mode, fields.value])
  if (mode === 'fixed') return { ...self, [fields.mode]: mode }
  const next = { ...without(self, [fields.value]), [fields.mode]: mode }
  return isMain ? { ...next, flex: CSS_DEFAULT_FLEX } : next
}

/** Новый `self` с числом по оси: режим становится фиксированным; пустое число — фиксированный без числа. */
export function withSizeValue(self: SelfProps, axis: SizeAxis, value: string): SelfProps {
  const fields = AXIS_FIELDS[axis]
  const trimmed = value.trim()
  const base = { ...self, [fields.mode]: 'fixed' as const }
  return trimmed === '' ? without(base, [fields.value]) : { ...base, [fields.value]: trimmed }
}

/**
 * Значки режимов размера для превью «Структура» (16.4): `↔` / `↕` у «Заполнить», `⊢360⊣` / `⊤48⊥` у «Фикс.»
 * (без числа — пустые скобки). У «Авто» значка нет.
 */
export function sizeMarks(self: SelfProps): string {
  const marks: string[] = []
  for (const axis of ['width', 'height'] as const) {
    const mode = sizeMode(self, axis)
    const glyphs = SIZE_MARK_GLYPHS[axis]
    if (mode === 'fill') marks.push(glyphs.fill)
    if (mode === 'fixed') marks.push(`${glyphs.fixedOpen}${sizeValue(self, axis) ?? ''}${glyphs.fixedClose}`)
  }
  return marks.join(' ')
}
