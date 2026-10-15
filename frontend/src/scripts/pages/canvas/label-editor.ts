/** Чистая геометрия поля ввода подписи на канвасе: прямоугольник поля в экранных координатах оверлея. */
import type { Rect } from './camera'
import { LABEL_EDITOR_HEIGHT, LABEL_EDITOR_INSET, LABEL_EDITOR_MIN_WIDTH, LABEL_EDITOR_WIDTH } from './constants'

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
