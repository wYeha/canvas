/** Тесты расчёта автопана при перетаскивании у края видимой области. */
import { describe, expect, it } from 'vitest'
import { dragAutopanDelta } from '@/scripts/pages/canvas/dnd/drag-autopan'

const AREA = { x: 100, y: 50, width: 800, height: 600 }
const MARGIN = 40
const SPEED = 10

describe('dragAutopanDelta', () => {
  it('в центре области сдвига нет', () => {
    expect(dragAutopanDelta({ x: 500, y: 350 }, AREA, MARGIN, SPEED)).toEqual({ dx: 0, dy: 0 })
  })

  it('у левого края — отрицательный dx, у правого — положительный', () => {
    expect(dragAutopanDelta({ x: 100, y: 350 }, AREA, MARGIN, SPEED).dx).toBe(-SPEED)
    expect(dragAutopanDelta({ x: 900, y: 350 }, AREA, MARGIN, SPEED).dx).toBe(SPEED)
  })

  it('у верхнего края — отрицательный dy, у нижнего — положительный', () => {
    expect(dragAutopanDelta({ x: 500, y: 50 }, AREA, MARGIN, SPEED).dy).toBe(-SPEED)
    expect(dragAutopanDelta({ x: 500, y: 650 }, AREA, MARGIN, SPEED).dy).toBe(SPEED)
  })

  it('на внутренней границе полосы скорость 0', () => {
    expect(dragAutopanDelta({ x: 140, y: 350 }, AREA, MARGIN, SPEED)).toEqual({ dx: 0, dy: 0 })
    expect(dragAutopanDelta({ x: 860, y: 350 }, AREA, MARGIN, SPEED)).toEqual({ dx: 0, dy: 0 })
  })

  it('между внутренним и внешним краем — линейная шкала', () => {
    const half = dragAutopanDelta({ x: 120, y: 350 }, AREA, MARGIN, SPEED).dx
    expect(half).toBeCloseTo(-SPEED / 2)
  })

  it('вырожденная область или нулевая скорость — без сдвига', () => {
    expect(dragAutopanDelta({ x: 0, y: 0 }, { x: 0, y: 0, width: 0, height: 0 }, MARGIN, SPEED)).toEqual({
      dx: 0,
      dy: 0,
    })
    expect(dragAutopanDelta({ x: 100, y: 50 }, AREA, MARGIN, 0)).toEqual({ dx: 0, dy: 0 })
  })
})
