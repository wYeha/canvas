/** Чистые функции WCAG-контраста: разбор hex, смешивание с альфой и отношение яркостей. Без Vue и DOM. */

/** Цвет в каналах sRGB, 0–255. */
export type Rgb = readonly [number, number, number]

/** Порог WCAG AA для обычного текста. */
export const WCAG_AA_TEXT_RATIO = 4.5

/** Основание степени и константы перевода sRGB-канала в линейный (формула WCAG 2.x). */
const SRGB_LINEAR_THRESHOLD = 0.04045
const SRGB_LINEAR_DIVISOR = 12.92
const SRGB_GAMMA_OFFSET = 0.055
const SRGB_GAMMA_DIVISOR = 1.055
const SRGB_GAMMA_POWER = 2.4
const CHANNEL_MAX = 255
const LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722] as const
const LUMINANCE_OFFSET = 0.05
const HEX_RADIX = 16
const HEX_FULL_LENGTH = 6
const HEX_SHORT_LENGTH = 3

/** Разбирает `#rrggbb` или `#rgb` в каналы; бросает ошибку на другом формате. */
export function parseHex(hex: string): Rgb {
  const digits = hex.trim().replace(/^#/, '')
  const full = digits.length === HEX_SHORT_LENGTH ? Array.from(digits, (ch) => ch + ch).join('') : digits
  if (full.length !== HEX_FULL_LENGTH || !/^[0-9a-f]+$/i.test(full)) throw new Error(`Не hex-цвет: ${hex}`)
  /** Канал с номером `i` (0 — красный). */
  function channel(i: number): number {
    return parseInt(full.slice(i * 2, i * 2 + 2), HEX_RADIX)
  }
  return [channel(0), channel(1), channel(2)]
}

/** Накладывает цвет `top` с непрозрачностью `alpha` (0–1) на непрозрачный `bottom`; возвращает непрозрачный цвет. */
export function blend(top: Rgb, bottom: Rgb, alpha: number): Rgb {
  /** Смесь канала `i`. */
  function mix(i: 0 | 1 | 2): number {
    return top[i] * alpha + bottom[i] * (1 - alpha)
  }
  return [mix(0), mix(1), mix(2)]
}

/** Относительная яркость цвета по WCAG. */
export function relativeLuminance(color: Rgb): number {
  const [r, g, b] = color.map((value) => {
    const c = value / CHANNEL_MAX
    return c <= SRGB_LINEAR_THRESHOLD
      ? c / SRGB_LINEAR_DIVISOR
      : ((c + SRGB_GAMMA_OFFSET) / SRGB_GAMMA_DIVISOR) ** SRGB_GAMMA_POWER
  }) as [number, number, number]
  return LUMINANCE_WEIGHTS[0] * r + LUMINANCE_WEIGHTS[1] * g + LUMINANCE_WEIGHTS[2] * b
}

/** Отношение контраста двух цветов по WCAG, от 1 до 21; порядок аргументов не важен. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + LUMINANCE_OFFSET) / (Math.min(la, lb) + LUMINANCE_OFFSET)
}
