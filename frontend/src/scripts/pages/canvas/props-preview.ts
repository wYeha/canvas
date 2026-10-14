/** Чистая логика секции «Ширина превью» корневого блока: пресеты, режим высоты, подсказка. Без Vue. */
import type { UiChipOption } from '@/scripts/components/ui-chips/ui-chips.types'
import type { UiSegmentedOption } from '@/scripts/components/ui-segmented/ui-segmented.types'
import {
  HEIGHT_MODE,
  HEIGHT_MODE_LABELS,
  PREVIEW_FALLBACK_HEIGHT,
  PREVIEW_HINT_OFF,
  PREVIEW_HINT_ON,
  WIDTH_PRESETS,
} from './constants'

/** Режим высоты превью: по содержимому или фиксированная. */
export type HeightMode = keyof typeof HEIGHT_MODE

/** Чипы пресетов ширины: значение — число строкой, подпись — оно же. */
export const WIDTH_PRESET_OPTIONS: readonly UiChipOption[] = WIDTH_PRESETS.map((width) => ({
  value: String(width),
  label: String(width),
}))

/** Варианты переключателя режима высоты. */
export const HEIGHT_MODE_OPTIONS: readonly UiSegmentedOption[] = [
  { value: HEIGHT_MODE.content, label: HEIGHT_MODE_LABELS.content },
  { value: HEIGHT_MODE.fixed, label: HEIGHT_MODE_LABELS.fixed },
]

/** Значение активного чипа: пресет, совпадающий с шириной; `null`, если ширина своя. */
export function activeWidthPreset(width: number | null): string | null {
  return WIDTH_PRESET_OPTIONS.find((option) => Number(option.value) === width)?.value ?? null
}

/** Режим высоты по `canvas.height`: `null` — по содержимому. */
export function heightModeOf(height: number | null): HeightMode {
  return height === null ? HEIGHT_MODE.content : HEIGHT_MODE.fixed
}

/** Новая `canvas.height` при смене режима: замер (округлённый) или запасное значение; по содержимому — `null`. */
export function heightForMode(mode: string | null, measured: number | undefined): number | null | undefined {
  if (mode === HEIGHT_MODE.content) return null
  if (mode !== HEIGHT_MODE.fixed) return undefined
  return measured !== undefined && measured > 0 ? Math.round(measured) : PREVIEW_FALLBACK_HEIGHT
}

/** Текст подсказки под переключателем max-width. */
export function previewHint(exportMaxWidth: boolean): string {
  return exportMaxWidth ? PREVIEW_HINT_ON : PREVIEW_HINT_OFF
}
