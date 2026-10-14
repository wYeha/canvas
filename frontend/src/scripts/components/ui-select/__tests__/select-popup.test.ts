/** Тесты popupStyle: список под кнопкой, над ней при нехватке места, зазор. */
import { describe, expect, it } from 'vitest'
import { POPUP_GAP, popupStyle, toPx } from '@/scripts/components/ui-select/select-popup'

const RECT = { top: 100, bottom: 128, left: 20, width: 200 }

describe('popupStyle', () => {
  it('ставит список под кнопкой, если места хватает', () => {
    expect(popupStyle(RECT, 1000)).toEqual({ left: '20px', width: '200px', top: toPx(128 + POPUP_GAP) })
  })

  it('открывает вверх, если снизу тесно, а сверху места достаточно', () => {
    const rect = { top: 700, bottom: 728, left: 20, width: 200 }
    expect(popupStyle(rect, 800)).toEqual({ left: '20px', width: '200px', bottom: toPx(800 - 700 + POPUP_GAP) })
  })

  it('остаётся снизу, если тесно с обеих сторон', () => {
    expect(popupStyle(RECT, 300)).toHaveProperty('top')
  })
})
