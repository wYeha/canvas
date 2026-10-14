/** Тесты чистых функций темы: выбор начальной темы, переключение, применение к корневому элементу. */
import { describe, expect, it } from 'vitest'
import { THEMES, THEME_ATTRIBUTE } from '@/scripts/globals/constants'
import { applyTheme, getOppositeTheme, isTheme, resolveInitialTheme } from '@/scripts/globals/theme'

describe('isTheme', () => {
  it('принимает только известные темы', () => {
    expect(isTheme('light')).toBe(true)
    expect(isTheme('dark')).toBe(true)
    expect(isTheme('sepia')).toBe(false)
    expect(isTheme(null)).toBe(false)
  })
})

describe('resolveInitialTheme', () => {
  it('сохранённый выбор важнее системной темы', () => {
    expect(resolveInitialTheme('light', true)).toBe(THEMES.LIGHT)
    expect(resolveInitialTheme('dark', false)).toBe(THEMES.DARK)
  })

  it('без сохранённого выбора следует системной теме', () => {
    expect(resolveInitialTheme(null, true)).toBe(THEMES.DARK)
    expect(resolveInitialTheme(null, false)).toBe(THEMES.LIGHT)
  })

  it('мусор в хранилище игнорируется', () => {
    expect(resolveInitialTheme('blue', false)).toBe(THEMES.LIGHT)
    expect(resolveInitialTheme('', true)).toBe(THEMES.DARK)
  })
})

describe('getOppositeTheme', () => {
  it('меняет тему на противоположную', () => {
    expect(getOppositeTheme(THEMES.LIGHT)).toBe(THEMES.DARK)
    expect(getOppositeTheme(THEMES.DARK)).toBe(THEMES.LIGHT)
  })
})

describe('applyTheme', () => {
  it('выставляет data-theme на корневом элементе', () => {
    const attributes: Record<string, string> = {}
    /** Записывает атрибут в объект вместо DOM. */
    const setAttribute = (name: string, value: string): void => {
      attributes[name] = value
    }
    applyTheme(THEMES.DARK, { setAttribute })
    expect(attributes).toEqual({ [THEME_ATTRIBUTE]: 'dark' })
  })
})
