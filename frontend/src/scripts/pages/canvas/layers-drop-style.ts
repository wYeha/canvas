/**
 * Динамические стили индикаторов перетаскивания в «Слоях» (исключение frontend.md §4.4): только положение и размер.
 * Оформление — BEM-классы.
 */
import type { Rect } from '@/scripts/pages/canvas/camera'
import { CSS_PX_UNIT } from '@/scripts/pages/canvas/constants'

/** Число в px для CSS. */
function px(value: number): string {
  return `${String(value)}${CSS_PX_UNIT}`
}

/** Стиль линии вставки в «Слоях»: положение и размер в экранных px. */
export function layerDropLineStyle(rect: Rect): Record<string, string> {
  return { left: px(rect.x), top: px(rect.y), width: px(rect.width), height: px(rect.height) }
}

/** Стиль призрака строки «Слоёв»: положение и размер в экранных px. */
export function layerDragGhostStyle(rect: Rect): Record<string, string> {
  return { left: px(rect.x), top: px(rect.y), width: px(rect.width), height: px(rect.height) }
}
