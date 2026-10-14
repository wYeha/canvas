/** Тесты общего валидатора CSS-значений: нормализация пробелов, запрещённые символы, пустые значения. */
import { describe, expect, it } from 'vitest'
import { isSafeCssValue, normalizeCssSpaces, parseCssValue } from '@/scripts/globals/css-value'

describe('normalizeCssSpaces', () => {
  it('схлопывает пробелы, табы и переводы строк и обрезает края', () => {
    expect(normalizeCssSpaces('  1fr \t  2fr\n')).toBe('1fr 2fr')
  })
})

describe('isSafeCssValue', () => {
  it('принимает обычные шаблоны', () => {
    expect(isSafeCssValue('repeat(auto-fill, minmax(200px, 1fr))')).toBe(true)
    expect(isSafeCssValue('[full-start] 1fr [full-end]')).toBe(true)
    expect(isSafeCssValue('')).toBe(true)
  })

  it.each([';', '"', '<', '>', '{', '}'])('отклоняет символ %s', (char) => {
    expect(isSafeCssValue(`1fr ${char} 2fr`)).toBe(false)
  })
})

describe('parseCssValue', () => {
  it('возвращает нормализованное значение', () => {
    expect(parseCssValue('  250px   1fr ', false)).toBe('250px 1fr')
  })

  it('пустое: null или пустая строка в зависимости от allowEmpty', () => {
    expect(parseCssValue('   ', false)).toBeNull()
    expect(parseCssValue('   ', true)).toBe('')
  })

  it('небезопасное значение даёт null', () => {
    expect(parseCssValue('1fr; color: red', true)).toBeNull()
    expect(parseCssValue('</style>', false)).toBeNull()
  })
})
