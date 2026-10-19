/** Чистая логика ширин связи: ширина превью источника против ширины места (плашки) и доступность «Подогнать». */
import { LINK_WIDTH_PARTS, LINK_WIDTH_UNKNOWN } from './constants'

/** Ширины для секции «Связь»: текст строки и можно ли подогнать источник под место. */
export interface LinkWidthState {
  text: string
  /** Целевая ширина источника (ширина места); `null`, если подгонять нечего или некуда. */
  fitTo: number | null
}

/** Ширина в целых px строкой; не замерена — прочерк. */
function px(width: number | null): string {
  return width === null ? LINK_WIDTH_UNKNOWN : `${String(width)}px`
}

/**
 * Строка «источник: 480px / место: 456px» и цель подгонки. Ширина места — замер плашки на поле в px поля
 * (округляется; включает редакторский отступ, как все замеры превью), ширина источника — ширина превью корня.
 */
export function linkWidthState(source: number, placeRaw: number | null): LinkWidthState {
  const place = placeRaw === null || placeRaw <= 0 ? null : Math.round(placeRaw)
  return {
    text: `${LINK_WIDTH_PARTS.source}: ${px(source)} / ${LINK_WIDTH_PARTS.place}: ${px(place)}`,
    fitTo: place !== null && place !== source ? place : null,
  }
}
