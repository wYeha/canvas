/** Тесты isUiKitRequested: витрина только в dev и только при ?ui. */
import { describe, expect, it } from 'vitest'
import { isUiKitRequested } from '@/scripts/globals/app-page'

describe('isUiKitRequested', () => {
  it('в dev с ?ui открывает витрину', () => {
    expect(isUiKitRequested(true, { ui: null })).toBe(true)
    expect(isUiKitRequested(true, { a: '1', ui: '' })).toBe(true)
  })

  it('без параметра ui — нет', () => {
    expect(isUiKitRequested(true, {})).toBe(false)
    expect(isUiKitRequested(true, { uix: null })).toBe(false)
  })

  it('вне dev — никогда', () => {
    expect(isUiKitRequested(false, { ui: null })).toBe(false)
  })
})
