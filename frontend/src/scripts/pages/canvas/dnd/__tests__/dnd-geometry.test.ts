/** Тесты геометрии перетаскивания: порог старта, координаты viewport, захват узла и призрак с учётом зума. */
import { describe, expect, it } from 'vitest'
import { CLICK_DRAG_THRESHOLD, DRAG_GHOST_MAX_SIZE } from '@/scripts/pages/canvas/constants'
import {
  createGrab,
  ghostRect,
  ghostScale,
  isDragStart,
  rootDragPosition,
  rootGrabOffset,
  toViewportPoint,
} from '@/scripts/pages/canvas/dnd/dnd-geometry'
import { dragGhostStyle } from '@/scripts/pages/canvas/dnd/dnd-style'

const MAX = { width: 320, height: 200 }

describe('isDragStart', () => {
  it('сдвиг не дальше порога — ещё не перетаскивание, дальше — перетаскивание', () => {
    const start = { x: 10, y: 10 }
    expect(isDragStart(start, { x: 10, y: 10 }, CLICK_DRAG_THRESHOLD)).toBe(false)
    expect(isDragStart(start, { x: 14, y: 10 }, CLICK_DRAG_THRESHOLD)).toBe(false)
    expect(isDragStart(start, { x: 13, y: 13 }, CLICK_DRAG_THRESHOLD)).toBe(true)
    expect(isDragStart(start, { x: 5, y: 10 }, CLICK_DRAG_THRESHOLD)).toBe(true)
  })
})

describe('toViewportPoint', () => {
  it('вычитает начало viewport на странице', () => {
    expect(toViewportPoint({ x: 150, y: 90 }, { x: 0, y: 44 })).toEqual({ x: 150, y: 46 })
  })
})

describe('createGrab', () => {
  it('смещение точки захвата от угла узла и размер узла — в координатах поля', () => {
    const grab = createGrab({ x: 130, y: 70 }, { x: 100, y: 50, width: 200, height: 80 })
    expect(grab).toEqual({ offset: { x: 30, y: 20 }, size: { width: 200, height: 80 } })
  })

  it('точка за границей узла (округление замера) зажимается в пределы узла', () => {
    const grab = createGrab({ x: 99.5, y: 131 }, { x: 100, y: 50, width: 200, height: 80 })
    expect(grab.offset).toEqual({ x: 0, y: 80 })
  })
})

describe('ghostScale', () => {
  it('маленький узел не уменьшается, большой — пропорционально до предела', () => {
    expect(ghostScale({ width: 100, height: 50 }, MAX)).toBe(1)
    expect(ghostScale({ width: 640, height: 100 }, MAX)).toBe(0.5)
    expect(ghostScale({ width: 100, height: 800 }, MAX)).toBe(0.25)
  })

  it('нулевой размер не даёт деления на 0', () => {
    expect(ghostScale({ width: 0, height: 0 }, MAX)).toBe(1)
  })
})

describe('ghostRect', () => {
  const grab = createGrab({ x: 30, y: 20 }, { x: 0, y: 0, width: 200, height: 100 })

  it('при 100% призрак — размер узла, точка захвата под указателем', () => {
    expect(ghostRect(grab, { x: 500, y: 300 }, 1, MAX)).toEqual({ x: 470, y: 280, width: 200, height: 100 })
  })

  it('зум меняет размер и смещение захвата: точка захвата остаётся под указателем', () => {
    expect(ghostRect(grab, { x: 500, y: 300 }, 0.5, MAX)).toEqual({ x: 485, y: 290, width: 100, height: 50 })
  })

  it('крупный узел уменьшается до предела, захват масштабируется тем же коэффициентом', () => {
    // 200×100 при 400% = 800×400 → k = min(320/800, 200/400) = 0.4
    const rect = ghostRect(grab, { x: 500, y: 300 }, 4, MAX)
    expect(rect.width).toBeCloseTo(320)
    expect(rect.height).toBeCloseTo(160)
    expect(rect.x).toBeCloseTo(500 - 30 * 4 * 0.4)
    expect(rect.y).toBeCloseTo(300 - 20 * 4 * 0.4)
  })

  it('предел из констант — 320×200', () => {
    expect(DRAG_GHOST_MAX_SIZE).toEqual(MAX)
  })
})

describe('rootGrabOffset / rootDragPosition', () => {
  it('смещение от угла корня не зажимается: заголовок над блоком даёт отрицательный y', () => {
    expect(rootGrabOffset({ x: 130, y: -12 }, { x: 100, y: 0 })).toEqual({ x: 30, y: -12 })
  })

  it('без сдвига указателя корень остаётся в той же точке', () => {
    const camera = { x: 40, y: 60, zoom: 0.5 }
    const rootAt = { x: 100, y: 0 }
    const pointer = { x: 40 + 130 * 0.5, y: 60 - 12 * 0.5 }
    const offset = rootGrabOffset({ x: 130, y: -12 }, rootAt)
    expect(rootDragPosition(offset, pointer, camera)).toEqual(rootAt)
  })

  it('сдвиг указателя на экране делится на зум; результат округляется до целых px поля', () => {
    const camera = { x: 0, y: 0, zoom: 0.5 }
    const offset = { x: 30, y: -12 }
    // указатель (100, 50) → поле (200, 100); минус смещение → (170, 112)
    expect(rootDragPosition(offset, { x: 100, y: 50 }, camera)).toEqual({ x: 170, y: 112 })
    expect(rootDragPosition(offset, { x: 100.3, y: 50.2 }, camera)).toEqual({ x: 171, y: 112 })
  })

  it('пан камеры при неподвижном указателе сдвигает точку корня на поле', () => {
    const offset = { x: 0, y: 0 }
    expect(rootDragPosition(offset, { x: 100, y: 100 }, { x: -50, y: 0, zoom: 1 })).toEqual({ x: 150, y: 100 })
  })
})

describe('dragGhostStyle', () => {
  it('положение и размер в px', () => {
    expect(dragGhostStyle({ x: 10.5, y: -4, width: 200, height: 100 })).toEqual({
      left: '10.5px',
      top: '-4px',
      width: '200px',
      height: '100px',
    })
  })
})
