/** Чистая логика секции «Блок»: варианты тега и применение черновиков текста. Без Vue. */
import { LAYOUT_TAGS, type LayoutTag } from '@shared'
import type { UiSelectOption } from '@/scripts/components/ui-select/ui-select.types'
import { ENTER_CODE, ESCAPE_CODE, NUMPAD_ENTER_CODE } from './constants'

/** Варианты селекта тега: значение и подпись совпадают. */
export const TAG_OPTIONS: readonly UiSelectOption[] = LAYOUT_TAGS.map((tag) => ({ value: tag, label: tag }))

/** Команда клавиатуры над черновиком: применить, откатить или ничего. */
export type DraftKeyCommand = 'apply' | 'cancel' | null

/** Сужает строку до тега документа; чужое значение — `null`. */
export function asLayoutTag(value: string | null): LayoutTag | null {
  return LAYOUT_TAGS.find((tag) => tag === value) ?? null
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
