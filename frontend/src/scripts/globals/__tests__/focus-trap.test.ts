/** Тесты фокус-ловушки: круг по Tab/Shift+Tab, фокус вне списка, пустой список. */
import { describe, expect, it } from 'vitest'
import { nextFocusIndex } from '@/scripts/globals/focus-trap'

describe('nextFocusIndex', () => {
  it('Tab идёт вперёд и замыкается на первом', () => {
    expect(nextFocusIndex(3, 0, false)).toBe(1)
    expect(nextFocusIndex(3, 2, false)).toBe(0)
  })

  it('Shift+Tab идёт назад и замыкается на последнем', () => {
    expect(nextFocusIndex(3, 1, true)).toBe(0)
    expect(nextFocusIndex(3, 0, true)).toBe(2)
  })

  it('фокус вне списка: Tab — на первый, Shift+Tab — на последний', () => {
    expect(nextFocusIndex(3, -1, false)).toBe(0)
    expect(nextFocusIndex(3, -1, true)).toBe(2)
  })

  it('пустой список даёт -1, единственный элемент остаётся на месте', () => {
    expect(nextFocusIndex(0, -1, false)).toBe(-1)
    expect(nextFocusIndex(1, 0, false)).toBe(0)
    expect(nextFocusIndex(1, 0, true)).toBe(0)
  })
})
