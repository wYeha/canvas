/** Чистая геометрия всплывающих списков (селект, меню): позиция под кнопкой или над ней, выравнивание по краю. */

/** Зазор между кнопкой и списком, px. */
export const POPUP_GAP = 4

/** Максимальная высота списка, px (продублирована в `$popup-list-max-height`). */
export const POPUP_MAX_HEIGHT = 240

/** Минимальная ширина меню, px (продублирована в `$popup-menu-min-width`); нужна, чтобы понять, влезет ли меню вправо. */
export const POPUP_MENU_WIDTH = 200

/** Прямоугольник кнопки в координатах окна (подмножество DOMRect). */
export interface AnchorRect {
  top: number
  bottom: number
  left: number
  right: number
  width: number
}

/** Размер окна. */
export interface ViewportSize {
  width: number
  height: number
}

/** Форматирует число как CSS-длину в пикселях. */
export function toPx(value: number): string {
  return String(value) + 'px'
}

/** Строит горизонтальную часть стиля: ширина кнопки (matchWidth) или выравнивание по левому/правому краю кнопки. */
function horizontalStyle(rect: AnchorRect, viewport: ViewportSize, matchWidth: boolean): Record<string, string> {
  if (matchWidth) return { left: toPx(rect.left), width: toPx(rect.width) }
  const overflowsRight = rect.left + POPUP_MENU_WIDTH > viewport.width
  return overflowsRight ? { right: toPx(viewport.width - rect.right) } : { left: toPx(rect.left) }
}

/**
 * Строит `position: fixed`-стиль списка: под кнопкой, а при нехватке места снизу — над ней (если сверху помещается).
 * matchWidth — список той же ширины, что кнопка (селект); иначе ширину задаёт CSS (меню), а край выбирается по месту.
 */
export function popupStyle(rect: AnchorRect, viewport: ViewportSize, matchWidth = true): Record<string, string> {
  const base = horizontalStyle(rect, viewport, matchWidth)
  const fitsBelow = rect.bottom + POPUP_GAP + POPUP_MAX_HEIGHT <= viewport.height
  const fitsAbove = rect.top - POPUP_GAP - POPUP_MAX_HEIGHT >= 0
  if (!fitsBelow && fitsAbove) return { ...base, bottom: toPx(viewport.height - rect.top + POPUP_GAP) }
  return { ...base, top: toPx(rect.bottom + POPUP_GAP) }
}
