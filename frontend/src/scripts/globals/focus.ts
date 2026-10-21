/**
 * Управление фокусом: кнопки редактора не забирают фокус при клике мышью, но остаются доступны с клавиатуры;
 * строки навигации при этом снимают фокус с открытого поля ввода.
 */

/** Левая кнопка мыши в MouseEvent.button. */
const PRIMARY_BUTTON = 0

/**
 * Обработчик mousedown для кнопок: отменяет перенос фокуса при клике мышью.
 * Иначе после клика кнопка держит фокус и пробел нажимает её вместо панорамирования канваса.
 * Клик (`click`) при этом срабатывает как обычно; с клавиатуры (Tab, Enter, пробел) кнопка работает.
 */
export function keepFocusOnMouseDown(e: MouseEvent): void {
  if (e.button === PRIMARY_BUTTON) e.preventDefault()
}

/** Теги полей ввода, у которых клавиши (Delete, стрелки) — правка текста, а не команды редактора. */
const FIELD_TAGS: ReadonlySet<string> = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Обработчик mousedown для строк навигации («Слои», хлебные крошки): как `keepFocusOnMouseDown`, но открытое поле
 * ввода теряет фокус. Иначе после клика по строке фокус остаётся в поле свойств, и Delete стирает текст вместо
 * удаления блока. `blur` срабатывает до `click`, поэтому черновик поля применяется к прежнему блоку.
 */
export function releaseFieldOnMouseDown(e: MouseEvent): void {
  if (e.button !== PRIMARY_BUTTON) return
  e.preventDefault()
  const active = document.activeElement
  if (active instanceof HTMLElement && (active.isContentEditable || FIELD_TAGS.has(active.tagName))) active.blur()
}
