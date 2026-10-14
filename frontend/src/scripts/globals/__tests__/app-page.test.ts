/** Тесты resolveAppPage: витрина только в dev и только при ?ui. */
import { describe, expect, it } from 'vitest'
import { APP_PAGES, resolveAppPage } from '@/scripts/globals/app-page'

describe('resolveAppPage', () => {
  it('в dev с ?ui открывает витрину', () => {
    expect(resolveAppPage(true, '?ui')).toBe(APP_PAGES.UI_KIT)
    expect(resolveAppPage(true, '?a=1&ui=')).toBe(APP_PAGES.UI_KIT)
  })

  it('без параметра ui открывает редактор', () => {
    expect(resolveAppPage(true, '')).toBe(APP_PAGES.CANVAS)
    expect(resolveAppPage(true, '?uix')).toBe(APP_PAGES.CANVAS)
  })

  it('вне dev всегда редактор', () => {
    expect(resolveAppPage(false, '?ui')).toBe(APP_PAGES.CANVAS)
  })
})
