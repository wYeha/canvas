/** Чистая логика поля ввода подписи: прямоугольник поля на канвасе в экранных координатах оверлея и клавиши поля. */
import type { Rect } from './camera'
import {
  ENTER_CODE,
  ESCAPE_CODE,
  NUMPAD_ENTER_CODE,
  LABEL_EDITOR_HEIGHT,
  LABEL_EDITOR_INSET,
  LABEL_EDITOR_MIN_WIDTH,
  LABEL_EDITOR_WIDTH,
} from './constants'

/**
 * Прямоугольник поля ввода: у левого верхнего угла блока `nodeRect` с отступом. Ширина обычная, но не шире блока
 * (с отступами с обеих сторон) и не уже минимума: в узком блоке поле выступает, зато остаётся читаемым.
 */
export function labelEditorRect(nodeRect: Rect): Rect {
  const available = nodeRect.width - LABEL_EDITOR_INSET * 2
  const width = Math.max(LABEL_EDITOR_MIN_WIDTH, Math.min(LABEL_EDITOR_WIDTH, available))
  return {
    x: nodeRect.x + LABEL_EDITOR_INSET,
    y: nodeRect.y + LABEL_EDITOR_INSET,
    width,
    height: LABEL_EDITOR_HEIGHT,
  }
}

/** Клавиша в поле подписи, сокращённая до нужного: код и идёт ли набор через IME. */
export interface LabelEditKey {
  code: string
  isComposing: boolean
}

/** Что делает клавиша в поле подписи: Enter применяет, Esc отменяет; Enter внутри IME подтверждает символы, а не подпись. */
export function labelEditKeyAction(e: LabelEditKey): 'finish' | 'cancel' | null {
  if (e.isComposing) return null
  if (e.code === ENTER_CODE || e.code === NUMPAD_ENTER_CODE) return 'finish'
  if (e.code === ESCAPE_CODE) return 'cancel'
  return null
}
