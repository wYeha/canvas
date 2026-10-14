/** Тесты общего валидатора CSS-значений: нормализация пробелов, запрещённые символы, баланс скобок, пустые значения. */
import { describe, expect, it } from 'vitest'
import { isSafeCssValue, normalizeCssSpaces, parseCssValue } from '@shared'

describe('normalizeCssSpaces', () => {
  it('схлопывает пробелы, табы и переводы строк и обрезает края', () => {
    expect(normalizeCssSpaces('  1fr \t  2fr\n')).toBe('1fr 2fr')
  })
})

describe('isSafeCssValue', () => {
  it('принимает обычные шаблоны', () => {
    expect(isSafeCssValue('repeat(auto-fill, minmax(200px, 1fr))')).toBe(true)
    expect(isSafeCssValue('[full-start] 1fr [full-end]')).toBe(true)
    expect(isSafeCssValue('calc(100% - 20px)')).toBe(true)
    expect(isSafeCssValue('')).toBe(true)
  })

  it.each([';', '"', "'", '\\', '&', '<', '>', '{', '}'])('отклоняет символ %s', (char) => {
    expect(isSafeCssValue(`1fr ${char} 2fr`)).toBe(false)
  })

  it('отклоняет начало и конец CSS-комментария', () => {
    expect(isSafeCssValue('1fr /* 2fr')).toBe(false)
    expect(isSafeCssValue('1fr */ 2fr')).toBe(false)
  })

  it.each(['url(x)', 'URL(x)', 'calc(1px + Url(a))'])('отклоняет функцию url() в любом регистре: %s', (value) => {
    expect(isSafeCssValue(value)).toBe(false)
  })

  it('одиночные / и * допустимы (grid-area, calc)', () => {
    expect(isSafeCssValue('1 / 3')).toBe(true)
    expect(isSafeCssValue('calc(2 * 10px)')).toBe(true)
  })

  it.each(['calc(100%', '1fr)', '[a 1fr', 'a] 1fr', 'calc(1px]', ')(', 'repeat(2, minmax(1px, 1fr)'])(
    'отклоняет несбалансированные скобки: %s',
    (value) => {
      expect(isSafeCssValue(value)).toBe(false)
    },
  )
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
    expect(parseCssValue('calc(100%', false)).toBeNull()
  })
})
