/** Логика окна горячих клавиш: группы таблицы, разобранные для шаблона. */
import { HOTKEY_GROUPS } from './hotkeys-modal.constants'
import { toGroupViews } from './hotkeys-keys'
import type { HotkeyGroupView } from './hotkeys-modal.types'

/** Возвращает группы таблицы с разобранными ячейками клавиш (данные статичны, считаются один раз). */
export function useHotkeysModal(): { groups: HotkeyGroupView[] } {
  return { groups: toGroupViews(HOTKEY_GROUPS) }
}
