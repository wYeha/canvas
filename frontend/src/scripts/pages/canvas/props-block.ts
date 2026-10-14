/** Чистая логика секции «Блок»: варианты тега, разбор и сборка padding, применение черновиков текста. Без Vue. */
import { LAYOUT_TAGS, type LayoutTag, type Padding } from '@shared'
import type { UiSelectOption } from '@/scripts/components/ui-select/ui-select.types'
import { ENTER_CODE, ESCAPE_CODE, NUMPAD_ENTER_CODE } from './constants'

/** Сторона padding. */
export type PaddingSide = keyof Padding

/** Варианты селекта тега: значение и подпись совпадают. */
export const TAG_OPTIONS: readonly UiSelectOption[] = LAYOUT_TAGS.map((tag) => ({ value: tag, label: tag }))

/** Команда клавиатуры над черновиком: применить, откатить или ничего. */
export type DraftKeyCommand = 'apply' | 'cancel' | null

/** Сужает строку до тега документа; чужое значение — `null`. */
export function asLayoutTag(value: string | null): LayoutTag | null {
  return LAYOUT_TAGS.find((tag) => tag === value) ?? null
}

/** `true`, если все четыре стороны равны (или padding нет). */
export function isUniformPadding(padding: Padding | null): boolean {
  if (padding === null) return true
  return padding.top === padding.right && padding.right === padding.bottom && padding.bottom === padding.left
}

/** Значение единого поля: общая величина сторон; `null` при отсутствии padding или разных сторонах. */
export function uniformPaddingValue(padding: Padding | null): number | null {
  return padding !== null && isUniformPadding(padding) ? padding.top : null
}

/** Стороны для четырёх полей: отсутствующий padding — нули. */
export function paddingSides(padding: Padding | null): Padding {
  return padding ?? { top: 0, right: 0, bottom: 0, left: 0 }
}

/** Нулевой padding не храним: все стороны 0 → `null` (в экспорт он не идёт). */
export function normalizePadding(padding: Padding): Padding | null {
  const { top, right, bottom, left } = padding
  return top === 0 && right === 0 && bottom === 0 && left === 0 ? null : padding
}

/** Padding из единого поля: число задаёт все 4 стороны, пусто или 0 — `null`. */
export function paddingFromUniform(value: number | null): Padding | null {
  if (value === null) return null
  return normalizePadding({ top: value, right: value, bottom: value, left: value })
}

/** Padding после правки одной стороны; пусто в поле стороны считается нулём. */
export function paddingWithSide(padding: Padding | null, side: PaddingSide, value: number | null): Padding | null {
  return normalizePadding({ ...paddingSides(padding), [side]: value ?? 0 })
}

/** Режим «по сторонам» при выделении блока: показывается сам, если стороны не равны. */
export function initialSidesMode(padding: Padding | null): boolean {
  return !isUniformPadding(padding)
}

/** Клавиша над черновиком: Enter (в многострочном — Ctrl/Cmd+Enter) применяет, Esc откатывает. */
export function draftKeyCommand(
  event: Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey'>,
  multiline: boolean,
): DraftKeyCommand {
  if (event.code === ESCAPE_CODE) return 'cancel'
  if (event.code !== ENTER_CODE && event.code !== NUMPAD_ENTER_CODE) return null
  return !multiline || event.ctrlKey || event.metaKey ? 'apply' : null
}
