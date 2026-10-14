/** Чистая геометрия выпадающего списка UiSelect: позиция под кнопкой или над ней, если снизу не хватает места. */

/** Зазор между кнопкой и списком, px. */
export const POPUP_GAP = 4

/** Максимальная высота списка, px (продублирована в `$select-list-max-height`). */
export const POPUP_MAX_HEIGHT = 240

/** Прямоугольник кнопки в координатах окна (подмножество DOMRect). */
export interface AnchorRect {
  top: number
  bottom: number
  left: number
  width: number
}

/** Форматирует число как CSS-длину в пикселях. */
export function toPx(value: number): string {
  return String(value) + 'px'
}

/** Строит `position: fixed`-стиль списка: под кнопкой, а при нехватке места снизу — над ней (если сверху помещается). */
export function popupStyle(rect: AnchorRect, viewportHeight: number): Record<string, string> {
  const base = { left: toPx(rect.left), width: toPx(rect.width) }
  const fitsBelow = rect.bottom + POPUP_GAP + POPUP_MAX_HEIGHT <= viewportHeight
  const fitsAbove = rect.top - POPUP_GAP - POPUP_MAX_HEIGHT >= 0
  if (!fitsBelow && fitsAbove) return { ...base, bottom: toPx(viewportHeight - rect.top + POPUP_GAP) }
  return { ...base, top: toPx(rect.bottom + POPUP_GAP) }
}
