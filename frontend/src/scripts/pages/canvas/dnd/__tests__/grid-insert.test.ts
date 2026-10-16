/** Тесты позиции вставки в grid-блок: ближайший ребёнок, поток по строкам (X), пропуск перетаскиваемого. */
import { describe, expect, it } from 'vitest'
import type { Rect } from '@/scripts/pages/canvas/camera'
import { gridInsertIndex } from '@/scripts/pages/canvas/dnd/grid-insert'
import { moveNode } from '@/scripts/pages/canvas/tree-move'
import { deepFreeze, makeDoc } from '@/scripts/pages/canvas/__tests__/tree-fixture'

/** Прямоугольник ребёнка; по умолчанию 100×40. */
function r(x: number, y: number, w = 100, h = 40): Rect {
  return { x, y, width: w, height: h }
}

/** Индекс вставки в точке (x, y) для заданных детей. */
function at(rects: (Rect | null)[], x: number, y: number, skip: number | null = null): number {
  return gridInsertIndex({ rects, pointer: { x, y }, skip })
}

describe('gridInsertIndex: одна строка', () => {
  const row = [r(0, 0), r(100, 0), r(200, 0)]

  it('по серединам детей слева направо', () => {
    expect(at(row, 10, 20)).toBe(0)
    expect(at(row, 60, 20)).toBe(1)
    expect(at(row, 160, 20)).toBe(2)
    expect(at(row, 260, 20)).toBe(3)
    expect(at(row, -50, 20)).toBe(0)
    expect(at(row, 900, 20)).toBe(3)
  })

  it('ровно на середине ребёнка — после него', () => {
    expect(at(row, 50, 20)).toBe(1)
  })
})

describe('gridInsertIndex: две строки', () => {
  const grid = [r(0, 0), r(100, 0), r(0, 50), r(100, 50)]

  it('ближайший по 2D, до/после только по X', () => {
    expect(at(grid, 60, 10)).toBe(1)
    expect(at(grid, 10, 60)).toBe(2)
    expect(at(grid, 60, 60)).toBe(3)
  })

  it('в зазоре между A и B по y — ближайший A, место после него', () => {
    expect(at(grid, 50, 5)).toBe(1)
  })
})

describe('gridInsertIndex: skip', () => {
  const row = [r(0, 0), r(100, 0), r(200, 0)]
  const skip = 1

  it('над бывшим местом пропущенного ребёнка — «на место»', () => {
    expect(at(row, 110, 20, skip)).toBe(1)
    expect(at(row, 190, 20, skip)).toBe(2)
    const doc = makeDoc()
    expect(moveNode(doc, 'a2', { type: 'child', parentId: 'A', index: 2 })).toBe(doc)
    expect(moveNode(doc, 'a2', { type: 'child', parentId: 'A', index: 1 })).toBe(doc)
  })

  it('левее середины первого — 0', () => {
    expect(at(row, 10, 20, skip)).toBe(0)
  })

  it('единственный ребёнок — сам перетаскиваемый: from + 1', () => {
    expect(at([r(0, 0)], 10, 20, 0)).toBe(1)
  })
})

describe('gridInsertIndex: пустые и не отрисованные дети', () => {
  it('пустой контейнер — 0', () => {
    expect(at([], 10, 10)).toBe(0)
  })

  it('все не замерены — в конец', () => {
    expect(at([null, null, null], 10, 10)).toBe(3)
  })

  it('не отрисованный ребёнок посередине — индексы соседей по nearest', () => {
    const rects = [r(0, 0), null, r(100, 0)]
    expect(at(rects, 60, 20)).toBe(1)
    expect(at(rects, 160, 20)).toBe(3)
  })
})

describe('gridInsertIndex: равное расстояние', () => {
  it('при равной дистанции — меньший DOM-индекс', () => {
    const rects = [r(0, 0, 100, 40), r(200, 0, 100, 40)]
    expect(at(rects, 150, 20)).toBe(1)
  })
})

describe('gridInsertIndex: внутри rect', () => {
  it('distance 0, до/после по X относительно середины', () => {
    const rects = [r(0, 0, 100, 40)]
    expect(at(rects, 30, 20)).toBe(0)
    expect(at(rects, 70, 20)).toBe(1)
  })
})

describe('gridInsertIndex: вход', () => {
  it('не мутирует прямоугольники и точку', () => {
    const rects = deepFreeze([r(0, 0), r(100, 0), r(0, 50)])
    const pointer = deepFreeze({ x: 60, y: 20 })
    expect(gridInsertIndex({ rects, pointer, skip: 0 })).toBeTypeOf('number')
  })
})
