/**
 * Динамические стили индикаторов перетаскивания в экранных координатах viewport (исключение frontend.md §4.4):
 * только положение и размер. Наклон, тень, цвета и пунктир — BEM-классы.
 */
import type { Rect } from '@/scripts/pages/canvas/camera'
import { CSS_PX_UNIT } from '@/scripts/pages/canvas/constants'

/** Число в px для CSS. */
function px(value: number): string {
  return `${String(value)}${CSS_PX_UNIT}`
}

/** Стиль призрака за курсором: положение и размер в экранных px. */
export function dragGhostStyle(rect: Rect): Record<string, string> {
  return { left: px(rect.x), top: px(rect.y), width: px(rect.width), height: px(rect.height) }
}
