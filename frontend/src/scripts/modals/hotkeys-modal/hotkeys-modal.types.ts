/** Типы окна горячих клавиш: строка и группа таблицы, части ячейки клавиш. */

/** Строка таблицы: `keys` — ячейка «Клавиши» как в USER_GUIDE.md (клавиши в обратных кавычках), `action` — действие без маркеров ✅. */
export interface HotkeyRow {
  keys: string
  action: string
}

/** Группа строк под заголовком раздела таблицы («Блоки», «История» …). */
export interface HotkeyGroup {
  title: string
  rows: readonly HotkeyRow[]
}

/** Часть ячейки клавиш: `key` — клавиша (чип), `text` — обычный текст между чипами («+», «/»). */
export interface HotkeyKeyPart {
  kind: 'key' | 'text'
  text: string
}

/** Строка таблицы для шаблона: действие и разобранная ячейка клавиш. */
export interface HotkeyRowView {
  /** Исходная ячейка клавиш: уникальна внутри группы, служит ключом строки. */
  keys: string
  action: string
  parts: HotkeyKeyPart[]
}

/** Группа таблицы для шаблона. */
export interface HotkeyGroupView {
  title: string
  rows: HotkeyRowView[]
}
