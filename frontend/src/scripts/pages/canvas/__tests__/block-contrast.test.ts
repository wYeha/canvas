/**
 * Контраст подписей блоков на канвасе: текст чипа и подписи листа на фоне цвета блока с его альфой поверх `paper`
 * в обеих темах, для каждого цвета палитры по глубине. Палитра, альфы и цвета темы читаются прямо из `_variables.scss`
 * (единый источник), поэтому правка токенов без пересчёта контраста роняет тест.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WCAG_AA_TEXT_RATIO, blend, contrastRatio, parseHex, type Rgb } from '@/scripts/globals/contrast'

const SCSS = readFileSync(new URL('../../../../styles/_variables.scss', import.meta.url), 'utf8')

type ThemeName = 'light' | 'dark'

/** Тело SCSS-карты `$name: ( ... );` до первой закрывающей `);` в начале строки. */
function mapBody(name: string): string {
  const start = SCSS.indexOf(`$${name}: (`)
  if (start < 0) throw new Error(`Нет карты ${name}`)
  return SCSS.slice(start, SCSS.indexOf('\n);', start))
}

/** Пары `'ключ': значение` карты; для цветов значение — hex. */
function entries(body: string): [string, string][] {
  return Array.from(body.matchAll(/'([\w-]+)':\s*([^,\n]+?),?\s*$/gm), (m) => [m[1] ?? '', m[2] ?? ''])
}

/** Значение ключа в карте `name` (для карты темы — первый встреченный ключ, группа colors идёт первой). */
function lookup(name: string, key: string): string {
  const found = entries(mapBody(name)).find(([k]) => k === key)
  if (found === undefined) throw new Error(`Нет ключа ${key} в ${name}`)
  return found[1]
}

/** Всё нужное для расчёта одной темы. */
function themeData(theme: ThemeName): {
  palette: Rgb[]
  fill: number
  chip: number
  text: Rgb
  muted: Rgb
  paper: Rgb
} {
  return {
    palette: entries(mapBody(`block-palette-${theme}`)).map(([, hex]) => parseHex(hex)),
    fill: Number(lookup(`block-alpha-${theme}`, 'fill')),
    chip: Number(lookup(`block-alpha-${theme}`, 'chip')),
    text: parseHex(lookup(`theme-${theme}`, 'text')),
    muted: parseHex(lookup(`theme-${theme}`, 'muted')),
    paper: parseHex(lookup(`theme-${theme}`, 'paper')),
  }
}

describe.each<ThemeName>(['light', 'dark'])('контраст подписей блоков, тема %s', (theme) => {
  const data = themeData(theme)

  it('палитра из 8 цветов, альфы и цвета темы прочитаны', () => {
    expect(data.palette).toHaveLength(8)
    expect(data.fill).toBeGreaterThan(0)
    expect(data.chip).toBeGreaterThan(0)
  })

  it.each(Array.from({ length: 8 }, (_, depth) => depth))(
    'глубина %i: текст чипа и подписи листа читается (≥ 4.5)',
    (depth) => {
      const color = data.palette[depth] as Rgb
      const blockBg = blend(color, data.paper, data.fill)
      const chipBg = blend(color, blockBg, data.chip)
      expect(contrastRatio(data.text, chipBg)).toBeGreaterThanOrEqual(WCAG_AA_TEXT_RATIO)
      expect(contrastRatio(data.text, blockBg)).toBeGreaterThanOrEqual(WCAG_AA_TEXT_RATIO)
      // Значок и ×N подписи листа окрашены muted прямо на подложке блока
      expect(contrastRatio(data.muted, blockBg)).toBeGreaterThanOrEqual(WCAG_AA_TEXT_RATIO)
    },
  )
})
