/** Тесты геометрии стрелок связей: концы на границах, диагональ, пересечение. */
import { describe, expect, it } from 'vitest'
import { arrowSegment } from '@/scripts/pages/canvas/link-arrows'

describe('arrowSegment', () => {
  it('по горизонтали — от правой грани источника к левой грани плашки', () => {
    expect(arrowSegment({ x: 0, y: 0, width: 100, height: 40 }, { x: 300, y: 0, width: 50, height: 40 })).toEqual({
      x1: 100,
      y1: 20,
      x2: 300,
      y2: 20,
    })
  })

  it('по диагонали — концы на границах по линии центров', () => {
    const segment = arrowSegment({ x: 0, y: 0, width: 100, height: 100 }, { x: 200, y: 200, width: 100, height: 100 })
    expect(segment).toEqual({ x1: 100, y1: 100, x2: 200, y2: 200 })
  })

  it('пересекающиеся прямоугольники — без стрелки', () => {
    expect(arrowSegment({ x: 0, y: 0, width: 100, height: 100 }, { x: 50, y: 50, width: 10, height: 10 })).toBeNull()
  })
})
