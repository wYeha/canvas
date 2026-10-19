/** Чистый разбор ячейки «Клавиши»: делит текст на клавиши (в обратных кавычках) и обычный текст между ними. */
import { HOTKEY_KEY_MARKER } from './hotkeys-modal.constants'
import type { HotkeyGroup, HotkeyGroupView, HotkeyKeyPart } from './hotkeys-modal.types'

/** Разбирает ячейку: «`Ctrl` + `D`» → [клавиша Ctrl, текст « + », клавиша D]; пустые куски отбрасываются. */
export function splitHotkeyKeys(keys: string): HotkeyKeyPart[] {
  // Нечётные куски после split по маркеру лежат внутри кавычек, чётные — снаружи
  return keys
    .split(HOTKEY_KEY_MARKER)
    .map((text, index): HotkeyKeyPart => ({
      kind: index % 2 === 1 ? 'key' : 'text',
      text,
      key: `${keys}:${String(index)}`,
    }))
    .filter((part) => part.text.trim() !== '')
    .map((part) => (part.kind === 'text' ? { ...part, text: part.text.trim() } : part))
}

/** Готовит группы для шаблона: у каждой строки ячейка клавиш разобрана на части. */
export function toGroupViews(groups: readonly HotkeyGroup[]): HotkeyGroupView[] {
  return groups.map((group) => ({
    title: group.title,
    rows: group.rows.map((row) => ({ keys: row.keys, action: row.action, parts: splitHotkeyKeys(row.keys) })),
  }))
}
