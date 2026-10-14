/** Тесты popupStyle: список под кнопкой, над ней при нехватке места, выравнивание меню по краю. */
import { describe, expect, it } from 'vitest'
import { POPUP_GAP, POPUP_MENU_WIDTH, popupStyle, toPx } from '@/scripts/globals/popup'

const RECT = { top: 100, bottom: 128, left: 20, right: 220, width: 200 }
const VIEWPORT = { width: 1000, height: 1000 }

describe('popupStyle', () => {
  it('ставит список под кнопкой той же ширины, если места хватает', () => {
    expect(popupStyle(RECT, VIEWPORT)).toEqual({ left: '20px', width: '200px', top: toPx(128 + POPUP_GAP) })
  })

  it('открывает вверх, если снизу тесно, а сверху места достаточно', () => {
    const rect = { top: 700, bottom: 728, left: 20, right: 220, width: 200 }
    expect(popupStyle(rect, { width: 1000, height: 800 })).toEqual({
      left: '20px',
      width: '200px',
      bottom: toPx(800 - 700 + POPUP_GAP),
    })
  })

  it('остаётся снизу, если тесно с обеих сторон', () => {
    expect(popupStyle(RECT, { width: 1000, height: 300 })).toHaveProperty('top')
  })

  it('меню без matchWidth не задаёт ширину и выравнивается по левому краю кнопки', () => {
    expect(popupStyle(RECT, VIEWPORT, false)).toEqual({ left: '20px', top: toPx(128 + POPUP_GAP) })
  })

  it('меню у правого края окна выравнивается по правому краю кнопки', () => {
    const rect = { top: 10, bottom: 38, left: 1000 - 28, right: 1000, width: 28 }
    expect(1000 - 28 + POPUP_MENU_WIDTH).toBeGreaterThan(1000)
    expect(popupStyle(rect, VIEWPORT, false)).toEqual({ right: '0px', top: toPx(38 + POPUP_GAP) })
  })
})
