/** Тесты стилей камеры: адаптивный шаг точек, transform слоя мира, фон viewport. */
import { describe, expect, it } from 'vitest'
import { gridScreenStep, viewportBackgroundStyle, worldLayerStyle } from '@/scripts/pages/canvas/camera-style'
import { CANVAS_GRID_STEP, GRID_MAX_SCREEN_STEP, GRID_MIN_SCREEN_STEP } from '@/scripts/pages/canvas/constants'

/** `true`, если `a / b` — целая степень двойки (положительная или отрицательная). */
function isPowerOfTwoRatio(a: number, b: number): boolean {
  const exponent = Math.log2(a / b)
  return Math.abs(exponent - Math.round(exponent)) < 1e-9
}

describe('gridScreenStep', () => {
  it('при 100% — мировой шаг', () => {
    expect(gridScreenStep(1)).toBe(CANVAS_GRID_STEP)
  })

  it('всегда в пределах и выровнен с сеткой поля', () => {
    for (const zoom of [0.1, 0.25, 0.5, 0.75, 1.5, 2, 3, 4]) {
      const step = gridScreenStep(zoom)
      expect(step).toBeGreaterThanOrEqual(GRID_MIN_SCREEN_STEP)
      expect(step).toBeLessThanOrEqual(GRID_MAX_SCREEN_STEP)
      expect(isPowerOfTwoRatio(step, CANVAS_GRID_STEP * zoom)).toBe(true)
    }
  })

  it('конкретные значения', () => {
    expect(gridScreenStep(0.5)).toBe(8)
    expect(gridScreenStep(0.25)).toBe(8)
    expect(gridScreenStep(0.1)).toBeCloseTo(12.8, 9)
    expect(gridScreenStep(4)).toBe(32)
  })
})

describe('worldLayerStyle / viewportBackgroundStyle', () => {
  it('transform слоя мира', () => {
    expect(worldLayerStyle({ x: 10, y: -20.5, zoom: 1.5 })).toEqual({
      transform: 'translate(10px, -20.5px) scale(1.5)',
    })
  })

  it('фон движется с полем: тайл сдвинут на полшага', () => {
    expect(viewportBackgroundStyle({ x: -30, y: 40, zoom: 2 })).toEqual({
      backgroundPosition: '-46px 24px',
      backgroundSize: '32px 32px',
    })
  })

  it('точка фона совпадает с началом поля', () => {
    for (const zoom of [0.5, 1, 2]) {
      const camera = { x: 37, y: -11, zoom }
      const { backgroundPosition, backgroundSize } = viewportBackgroundStyle(camera)
      const [posX = NaN, posY = NaN] = backgroundPosition.split(' ').map((v) => parseFloat(v))
      const step = parseFloat(backgroundSize)
      // radial-gradient рисует точку в центре тайла: тайл начинается в pos, точка — в pos + step / 2.
      expect(posX + step / 2).toBeCloseTo(camera.x, 9)
      expect(posY + step / 2).toBeCloseTo(camera.y, 9)
    }
  })
})
