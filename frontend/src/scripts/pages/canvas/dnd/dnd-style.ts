/**
 * Динамические стили индикаторов перетаскивания в экранных координатах viewport (исключение frontend.md §4.4):
 * только положение и размер. Наклон, тень, цвета и пунктир — BEM-классы.
 */
import type { Rect } from '@/scripts/pages/canvas/camera'
import { CSS_PX_UNIT } from '@/scripts/pages/canvas/constants'
import type { ScreenSegment } from './dnd-geometry'

/** Число в px для CSS. */
function px(value: number): string {
  return `${String(value)}${CSS_PX_UNIT}`
}

/** Стиль призрака за курсором: положение и размер в экранных px. */
export function dragGhostStyle(rect: Rect): Record<string, string> {
  return { left: px(rect.x), top: px(rect.y), width: px(rect.width), height: px(rect.height) }
}

/** Стиль линии протягиваемой связи: начало, длина и поворот вокруг начала (`transform-origin` — в классе). */
export function linkDraftLineStyle(segment: ScreenSegment): Record<string, string> {
  return {
    left: px(segment.x),
    top: px(segment.y),
    width: px(segment.length),
    transform: `rotate(${String(segment.angle)}deg)`,
  }
}

/** Стиль полосы линии вставки: положение и размер в экранных px viewport. */
export function dropInsertLineStyle(rect: Rect): Record<string, string> {
  return { left: px(rect.x), top: px(rect.y), width: px(rect.width), height: px(rect.height) }
}
