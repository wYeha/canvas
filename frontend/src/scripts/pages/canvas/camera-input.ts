/**
 * Чистые разборщики ввода камеры: колесо → пан или зум, клавиши → команда камеры, проверка полей ввода.
 * Принимают минимальные интерфейсы вместо DOM-событий, чтобы тестироваться без браузера.
 */
import {
  ARROW_DOWN_CODE,
  ARROW_UP_CODE,
  BACKSPACE_CODE,
  COPY_HOTKEY_CODE,
  CREATE_FLEX_CODE,
  CREATE_GRID_CODE,
  DELETE_CODE,
  DUPLICATE_HOTKEY_CODE,
  ENTER_CODE,
  EXPORT_HOTKEY_CODE,
  ESCAPE_CODE,
  NUMPAD_ENTER_CODE,
  PASTE_HOTKEY_CODE,
  REDO_HOTKEY_CODE,
  RENAME_HOTKEY_CODE,
  SPACE_CODE,
  UNDO_HOTKEY_CODE,
  WHEEL_DELTA_LINE,
  WHEEL_DELTA_PAGE,
  WHEEL_LINE_HEIGHT,
  WHEEL_PAGE_HEIGHT,
  WHEEL_ZOOM_MAX_DELTA,
  WHEEL_ZOOM_SENSITIVITY,
} from './constants'

/** Нужные поля события колеса. */
export interface WheelLike {
  deltaX: number
  deltaY: number
  deltaMode: number
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

/** Действие колеса: зум множителем или пан на экранные px. */
export type WheelAction = { kind: 'zoom'; factor: number } | { kind: 'pan'; dx: number; dy: number }

/** Нужные поля события клавиатуры. */
export interface KeyLike {
  code: string
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  altKey: boolean
}

/** Команда камеры по хоткею. */
export type CameraCommand = 'zoom-in' | 'zoom-out' | 'zoom-reset' | 'fit-all' | 'fit-selection'

/** Команда навигации по выделению: к родителю (Esc) или к первому ребёнку (Enter). */
export type SelectionCommand = 'select-parent' | 'select-child'

/** Команда редактирования выделенного блока по хоткею. */
export type EditCommand = 'delete' | 'duplicate' | 'move-up' | 'move-down' | 'rename' | 'copy' | 'paste'

/** Команда истории по хоткею. */
export type HistoryCommand = 'undo' | 'redo'

/** Вид блока, который создаёт хоткей: F — flex, G — grid. */
export type CreateKind = 'flex' | 'grid'

/** Нужные поля цели события для проверки «это поле ввода». */
export type EditableLike = { tagName: string; isContentEditable: boolean } | null

/** Нужные поля цели события для проверки «у пробела здесь своё действие». */
export type InteractiveLike = { tagName: string; isContentEditable: boolean; role: string | null } | null

/** Нужные поля события пробела. */
export interface SpaceKeyLike extends KeyLike {
  defaultPrevented: boolean
}

/** Хоткеи с Ctrl/Cmd: `event.code` → команда (по коду, чтобы работало в любой раскладке). */
const CTRL_HOTKEYS: Readonly<Record<string, CameraCommand>> = {
  Equal: 'zoom-in',
  NumpadAdd: 'zoom-in',
  Minus: 'zoom-out',
  NumpadSubtract: 'zoom-out',
  Digit0: 'zoom-reset',
  Numpad0: 'zoom-reset',
}

/** Хоткеи с одним Shift: `event.code` → команда. */
const SHIFT_HOTKEYS: Readonly<Record<string, CameraCommand>> = {
  Digit1: 'fit-all',
  Digit2: 'fit-selection',
}

/** Теги полей ввода, в которых хоткеи канваса не срабатывают. */
const EDITABLE_TAGS: ReadonlySet<string> = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/** Теги, которые пробел нажимает или раскрывает сам: его нельзя забирать под пан. */
const INTERACTIVE_TAGS: ReadonlySet<string> = new Set(['BUTTON', 'A', 'SUMMARY'])

/** ARIA-роли, которые пробел нажимает или переключает. */
const INTERACTIVE_ROLES: ReadonlySet<string> = new Set(['button', 'switch', 'checkbox', 'radio'])

/** Переводит дельту колеса в px с учётом `deltaMode` (px / строки / страницы). */
export function normalizeWheelDelta(delta: number, deltaMode: number): number {
  if (deltaMode === WHEEL_DELTA_LINE) return delta * WHEEL_LINE_HEIGHT
  if (deltaMode === WHEEL_DELTA_PAGE) return delta * WHEEL_PAGE_HEIGHT
  return delta
}

/**
 * Разбирает колесо: с Ctrl/Cmd (так же приходит щипок тачпада) — зум, иначе пан.
 * Зум: `exp(-clamp(deltaY) · k)` — дельта ограничена, чтобы щелчок мыши и щипок давали сопоставимый шаг.
 * Пан: поле движется против прокрутки; Shift + вертикальное колесо — горизонтально.
 */
export function wheelToAction(e: WheelLike): WheelAction {
  const deltaX = normalizeWheelDelta(e.deltaX, e.deltaMode)
  const deltaY = normalizeWheelDelta(e.deltaY, e.deltaMode)
  if (e.ctrlKey || e.metaKey) {
    const clamped = Math.max(-WHEEL_ZOOM_MAX_DELTA, Math.min(WHEEL_ZOOM_MAX_DELTA, deltaY))
    return { kind: 'zoom', factor: Math.exp(-clamped * WHEEL_ZOOM_SENSITIVITY) }
  }
  if (e.shiftKey && deltaX === 0) return { kind: 'pan', dx: -deltaY, dy: 0 }
  return { kind: 'pan', dx: -deltaX, dy: -deltaY }
}

/** Сопоставляет клавишу команде камеры; Alt блокирует все хоткеи камеры. */
export function matchCameraHotkey(e: KeyLike): CameraCommand | null {
  if (e.altKey) return null
  if (e.ctrlKey || e.metaKey) return CTRL_HOTKEYS[e.code] ?? null
  if (e.shiftKey) return SHIFT_HOTKEYS[e.code] ?? null
  return null
}

/** `true` для Ctrl/Cmd + E без Shift и Alt (окно экспорта); по коду клавиши, поэтому работает в любой раскладке. */
export function matchExportHotkey(e: KeyLike): boolean {
  if (e.altKey || e.shiftKey) return false
  return (e.ctrlKey || e.metaKey) && e.code === EXPORT_HOTKEY_CODE
}

/** Сопоставляет F / G без модификаторов созданию flex- или grid-блока; по коду клавиши, поэтому работает в любой раскладке. */
export function matchCreateHotkey(e: KeyLike): CreateKind | null {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return null
  if (e.code === CREATE_FLEX_CODE) return 'flex'
  if (e.code === CREATE_GRID_CODE) return 'grid'
  return null
}

/** Команды редактирования с Ctrl/Cmd: `event.code` → команда. */
const CTRL_EDIT_HOTKEYS: Readonly<Record<string, EditCommand>> = {
  [DUPLICATE_HOTKEY_CODE]: 'duplicate',
  [COPY_HOTKEY_CODE]: 'copy',
  [PASTE_HOTKEY_CODE]: 'paste',
}

/** Команды редактирования без модификаторов: `event.code` → команда. */
const PLAIN_EDIT_HOTKEYS: Readonly<Record<string, EditCommand>> = {
  [DELETE_CODE]: 'delete',
  [BACKSPACE_CODE]: 'delete',
  [RENAME_HOTKEY_CODE]: 'rename',
}

/** Команды редактирования, которым повтор при удержании клавиши безопасен (остальные срабатывают один раз). */
const REPEATABLE_EDIT_COMMANDS: ReadonlySet<EditCommand> = new Set(['move-up', 'move-down'])

/**
 * Сопоставляет клавишу команде редактирования: Del / Backspace, F2 — без модификаторов; Ctrl/Cmd + D, C, V;
 * Alt + ↑ / ↓. Лишние модификаторы (Shift, Alt у Ctrl-сочетаний) отменяют хоткей; по коду клавиши, поэтому
 * работает в любой раскладке.
 */
export function matchEditHotkey(e: KeyLike): EditCommand | null {
  const ctrl = e.ctrlKey || e.metaKey
  if (ctrl) return e.altKey || e.shiftKey ? null : (CTRL_EDIT_HOTKEYS[e.code] ?? null)
  if (e.altKey) {
    if (e.shiftKey) return null
    if (e.code === ARROW_UP_CODE) return 'move-up'
    return e.code === ARROW_DOWN_CODE ? 'move-down' : null
  }
  return e.shiftKey ? null : (PLAIN_EDIT_HOTKEYS[e.code] ?? null)
}

/**
 * Сопоставляет клавишу команде истории: Ctrl/Cmd + Z — отменить, Ctrl/Cmd + Shift + Z и Ctrl/Cmd + Y — повторить.
 * Alt отменяет хоткей; по коду клавиши, поэтому работает в любой раскладке.
 */
export function matchHistoryHotkey(e: KeyLike): HistoryCommand | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null
  if (e.code === UNDO_HOTKEY_CODE) return e.shiftKey ? 'redo' : 'undo'
  return e.code === REDO_HOTKEY_CODE && !e.shiftKey ? 'redo' : null
}

/** `true`, если команду можно повторять при удержании клавиши (`event.repeat`). */
export function isRepeatableEdit(command: EditCommand): boolean {
  return REPEATABLE_EDIT_COMMANDS.has(command)
}

/** Сопоставляет Esc и Enter без модификаторов команде навигации по выделению. */
export function matchSelectionHotkey(e: KeyLike): SelectionCommand | null {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return null
  if (e.code === ESCAPE_CODE) return 'select-parent'
  if (e.code === ENTER_CODE || e.code === NUMPAD_ENTER_CODE) return 'select-child'
  return null
}

/** `true`, если цель — поле ввода или редактируемый элемент. */
export function isEditableTarget(target: EditableLike): boolean {
  if (target === null) return false
  return target.isContentEditable || EDITABLE_TAGS.has(target.tagName)
}

/** `true`, если у пробела на цели своё действие: поле ввода, кнопка, ссылка, переключатель. */
export function isInteractiveTarget(target: InteractiveLike): boolean {
  if (target === null) return false
  if (isEditableTarget(target) || INTERACTIVE_TAGS.has(target.tagName)) return true
  return target.role !== null && INTERACTIVE_ROLES.has(target.role)
}

/**
 * `true`, если пробел нужно забрать под пан: это `Space` без Ctrl/Alt/Meta, его ещё никто не обработал,
 * и фокус не на интерактивном элементе (иначе с клавиатуры не нажать кнопку или чекбокс).
 */
export function shouldCaptureSpace(e: SpaceKeyLike, target: InteractiveLike): boolean {
  if (e.code !== SPACE_CODE || e.defaultPrevented) return false
  if (e.ctrlKey || e.altKey || e.metaKey) return false
  return !isInteractiveTarget(target)
}
