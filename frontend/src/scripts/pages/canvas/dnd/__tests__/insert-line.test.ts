/** Тесты геометрии линии вставки: flex row/column, перенос, grid, пустой контейнер. */
import { describe, expect, it } from 'vitest'
import type { Rect } from '@/scripts/pages/canvas/camera'
import { insertLineRect } from '@/scripts/pages/canvas/dnd/insert-line'

/** Прямоугольник ребёнка; по умолчанию 100×40. */
function r(x: number, y: number, w = 100, h = 40): Rect {
  return { x, y, width: w, height: h }
}

/** Линия flex в точке вставки `index`. */
function flexLine(
  rects: (Rect | null)[],
  index: number,
  options: { direction?: 'row' | 'column'; wrap?: boolean; parent?: Rect | null } = {},
): Rect {
  const { direction = 'row', wrap = false, parent = null } = options
  const line = insertLineRect({
    container: { kind: 'flex', direction, wrap },
    rects,
    index,
    parentRect: parent,
  })
  expect(line).not.toBeNull()
  return line as Rect
}

describe('insertLineRect: flex row', () => {
  const row = [r(0, 0), r(100, 0), r(200, 0)]
  const parent = r(-10, -5, 330, 50)

  it('между соседями — вертикальная полоса посередине зазора', () => {
    const gapRow = [r(0, 0), r(110, 0), r(220, 0)]
    const line = flexLine(gapRow, 1, { parent })
    expect(line.x + line.width / 2).toBeCloseTo(105, 0)
    expect(line.width).toBeGreaterThan(0)
    expect(line.height).toBeCloseTo(40, 0)
  })

  it('в начало — между краем приёмника и первым ребёнком', () => {
    const line = flexLine(row, 0, { parent })
    expect(line.x + line.width / 2).toBeCloseTo(-5, 0)
  })

  it('в конец — между последним ребёнком и краем приёмника', () => {
    const line = flexLine(row, 3, { parent })
    expect(line.x + line.width / 2).toBeCloseTo(310, 0)
  })

  it('пустой контейнер — по центру приёмника', () => {
    const line = flexLine([], 0, { parent })
    expect(line.x + line.width / 2).toBeCloseTo(155, 0)
    expect(line.height).toBeCloseTo(50, 0)
  })
})

describe('insertLineRect: flex column', () => {
  const column = [r(0, 0), r(0, 40), r(0, 80)]

  it('между соседями — горизонтальная полоса', () => {
    const line = flexLine(column, 1, { direction: 'column' })
    expect(line.y + line.height / 2).toBeCloseTo(40, 0)
    expect(line.height).toBeLessThan(5)
    expect(line.width).toBeCloseTo(100, 0)
  })
})

describe('insertLineRect: flex wrap', () => {
  const rows = [r(0, 0), r(100, 0), r(0, 50), r(100, 50)]

  it('между соседями в одной линии — вертикальная полоса', () => {
    const line = flexLine(rows, 1, { wrap: true })
    expect(line.x + line.width / 2).toBeCloseTo(100, 0)
    expect(line.height).toBeCloseTo(40, 0)
  })

  it('между flex-линиями — горизонтальная полоса', () => {
    const line = flexLine(rows, 2, { wrap: true })
    expect(line.y + line.height / 2).toBeCloseTo(45, 0)
    expect(line.width).toBeGreaterThan(150)
  })
})

/** Линия grid в точке вставки `index`. */
function gridLine(rects: (Rect | null)[], index: number, parent: Rect | null = null): Rect {
  const line = insertLineRect({ container: { kind: 'grid' }, rects, index, parentRect: parent })
  expect(line).not.toBeNull()
  return line as Rect
}

describe('insertLineRect: skip', () => {
  const row = [r(0, 0), r(100, 0), r(200, 0)]

  it('перетаскиваемый ребёнок не участвует в зазоре перед следующим соседом', () => {
    const gapRow = [r(0, 0), r(110, 0), r(220, 0)]
    const line = insertLineRect({
      container: { kind: 'flex', direction: 'row', wrap: false },
      rects: gapRow,
      index: 2,
      skip: 1,
    })
    expect(line).not.toBeNull()
    expect((line as Rect).x + (line as Rect).width / 2).toBeCloseTo(160, 0)
  })

  it('skip в начале — линия у первого видимого ребёнка', () => {
    const line = insertLineRect({
      container: { kind: 'flex', direction: 'row', wrap: false },
      rects: row,
      index: 1,
      skip: 0,
    })
    expect(line).not.toBeNull()
    expect((line as Rect).x + (line as Rect).width / 2).toBeCloseTo(150, 0)
  })
})

describe('insertLineRect: grid', () => {
  it('между соседями по X', () => {
    const gapRow = [r(0, 0), r(110, 0), r(220, 0)]
    const line = gridLine(gapRow, 1)
    expect(line.x + line.width / 2).toBeCloseTo(105, 0)
  })

  it('пустой grid — по parentRect', () => {
    const parent = r(0, 0, 200, 80)
    const line = gridLine([], 0, parent)
    expect(line.x + line.width / 2).toBeCloseTo(100, 0)
    expect(line.height).toBeCloseTo(80, 0)
  })
})
