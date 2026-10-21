/** Тесты scroll-area: прокрутит ли колесо область по её оси или упрётся в край. */
import { describe, expect, it } from 'vitest'
import { canScrollBy, type ScrollMetrics } from '@/scripts/pages/canvas/scroll-area'

/** Область 100×100 с содержимым 300×300, прокрученная в `top`/`left`. */
function metrics(top: number, left = 0): ScrollMetrics {
  return { scrollTop: top, scrollHeight: 300, clientHeight: 100, scrollLeft: left, scrollWidth: 300, clientWidth: 100 }
}

describe('canScrollBy', () => {
  it('вниз — пока не дошли до конца, вверх — пока не в начале', () => {
    expect(canScrollBy(metrics(0), 'y', { x: 0, y: 40 })).toBe(true)
    expect(canScrollBy(metrics(0), 'y', { x: 0, y: -40 })).toBe(false)
    expect(canScrollBy(metrics(200), 'y', { x: 0, y: 40 })).toBe(false)
    expect(canScrollBy(metrics(200), 'y', { x: 0, y: -40 })).toBe(true)
  })

  it('дробный остаток у края (зум) считается краем', () => {
    expect(canScrollBy(metrics(199.6), 'y', { x: 0, y: 40 })).toBe(false)
    expect(canScrollBy(metrics(0.4), 'y', { x: 0, y: -40 })).toBe(false)
  })

  it('учитывается только своя ось: вертикальное колесо не двигает горизонтальную область', () => {
    expect(canScrollBy(metrics(0, 0), 'x', { x: 0, y: 40 })).toBe(false)
    expect(canScrollBy(metrics(0, 0), 'x', { x: 40, y: 0 })).toBe(true)
  })

  it('без переполнения прокручивать некуда', () => {
    const fits = { ...metrics(0), scrollHeight: 100 }
    expect(canScrollBy(fits, 'y', { x: 0, y: 40 })).toBe(false)
  })
})
