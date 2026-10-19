/** Тесты расчёта WCAG-контраста: разбор hex, смешивание, известные эталонные отношения. */
import { describe, expect, it } from 'vitest'
import { blend, contrastRatio, parseHex, relativeLuminance } from '@/scripts/globals/contrast'

describe('parseHex', () => {
  it('разбирает полную и короткую запись', () => {
    expect(parseHex('#4c7bf4')).toEqual([76, 123, 244])
    expect(parseHex('#fff')).toEqual([255, 255, 255])
  })

  it('бросает ошибку на мусоре', () => {
    expect(() => parseHex('rgb(0 0 0)')).toThrow()
    expect(() => parseHex('#12345g')).toThrow()
  })
})

describe('blend', () => {
  it('альфа 0 даёт нижний цвет, 1 — верхний, 0.5 — середину', () => {
    expect(blend([200, 100, 0], [0, 0, 0], 0)).toEqual([0, 0, 0])
    expect(blend([200, 100, 0], [0, 0, 0], 1)).toEqual([200, 100, 0])
    expect(blend([200, 100, 0], [0, 0, 0], 0.5)).toEqual([100, 50, 0])
  })
})

describe('contrastRatio', () => {
  it('чёрное на белом даёт 21, одинаковые цвета — 1', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(contrastRatio([10, 20, 30], [10, 20, 30])).toBeCloseTo(1, 5)
  })

  it('симметрична по аргументам', () => {
    const a = parseHex('#5d6470')
    const b = parseHex('#ffffff')
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10)
  })

  it('эталон: #767676 на белом — около 4.54', () => {
    expect(contrastRatio(parseHex('#767676'), parseHex('#ffffff'))).toBeCloseTo(4.54, 2)
  })

  it('яркость белого — 1, чёрного — 0', () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5)
    expect(relativeLuminance([0, 0, 0])).toBe(0)
  })
})
