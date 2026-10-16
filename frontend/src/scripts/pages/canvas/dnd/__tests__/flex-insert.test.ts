/** Тесты позиции вставки во flex-блок: направления, reverse, перенос на линии, пропуск перетаскиваемого ребёнка. */
import { describe, expect, it } from 'vitest'
import type { Rect } from '@/scripts/pages/canvas/camera'
import { flexFlow, flexInsertIndex, type FlexInsertInput } from '@/scripts/pages/canvas/dnd/flex-insert'
import { moveNode } from '@/scripts/pages/canvas/tree-move'
import { deepFreeze, makeDoc } from '@/scripts/pages/canvas/__tests__/tree-fixture'

/** Прямоугольник ребёнка; по умолчанию 100×40. */
function r(x: number, y: number, w = 100, h = 40): Rect {
  return { x, y, width: w, height: h }
}

/** Индекс вставки в точке (x, y) для заданных детей; по умолчанию row без переноса и без пропуска. */
function at(rects: (Rect | null)[], x: number, y: number, options: Partial<FlexInsertInput> = {}): number {
  return flexInsertIndex({ direction: 'row', wrap: false, skip: null, ...options, rects, pointer: { x, y } })
}

describe('flexFlow', () => {
  it('главная ось и reverse по направлению', () => {
    expect(flexFlow('row')).toEqual({ main: 'x', reverse: false })
    expect(flexFlow('row-reverse')).toEqual({ main: 'x', reverse: true })
    expect(flexFlow('column')).toEqual({ main: 'y', reverse: false })
    expect(flexFlow('column-reverse')).toEqual({ main: 'y', reverse: true })
  })
})

describe('flexInsertIndex: одна линия', () => {
  const row = [r(0, 0), r(100, 0), r(200, 0)]

  it('row: по серединам детей слева направо', () => {
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

  it('row-reverse: DOM [A, B, C] стоят справа налево', () => {
    const rects = [r(200, 0), r(100, 0), r(0, 0)]
    const options = { direction: 'row-reverse' } as const
    expect(at(rects, 280, 20, options)).toBe(0)
    expect(at(rects, 220, 20, options)).toBe(1)
    expect(at(rects, 20, 20, options)).toBe(3)
    expect(at(rects, -50, 20, options)).toBe(3)
    expect(at(rects, 900, 20, options)).toBe(0)
  })

  it('column: по серединам сверху вниз', () => {
    const rects = [r(0, 0), r(0, 40), r(0, 80)]
    const options = { direction: 'column' } as const
    expect(at(rects, 10, 10, options)).toBe(0)
    expect(at(rects, 10, 30, options)).toBe(1)
    expect(at(rects, 10, 70, options)).toBe(2)
    expect(at(rects, 10, 110, options)).toBe(3)
    expect(at(rects, 10, -50, options)).toBe(0)
  })

  it('column-reverse: DOM [A, B, C] стоят снизу вверх', () => {
    const rects = [r(0, 80), r(0, 40), r(0, 0)]
    const options = { direction: 'column-reverse' } as const
    expect(at(rects, 10, 110, options)).toBe(0)
    expect(at(rects, 10, 90, options)).toBe(1)
    expect(at(rects, 10, 10, options)).toBe(3)
    expect(at(rects, 10, -50, options)).toBe(3)
    expect(at(rects, 10, 900, options)).toBe(0)
  })

  it('без переноса «перенесённые» прямоугольники — одна линия, поперечная ось не важна', () => {
    const rects = [r(0, 0), r(100, 0), r(0, 50), r(100, 50)]
    expect(at(rects, 10, 70)).toBe(0)
    expect(at(rects, 190, 20)).toBe(4)
  })
})

describe('flexInsertIndex: перенос на линии', () => {
  const rows = [r(0, 0), r(100, 0), r(0, 50), r(100, 50)]
  const wrap = { wrap: true }

  it('row: сначала линия по поперечной оси, потом место в ней', () => {
    expect(at(rows, 10, 20, wrap)).toBe(0)
    expect(at(rows, 190, 20, wrap)).toBe(2)
    expect(at(rows, 10, 70, wrap)).toBe(2)
    expect(at(rows, 190, 70, wrap)).toBe(4)
  })

  it('зазор между линиями делится пополам; выше всех — первая, ниже всех — последняя', () => {
    expect(at(rows, 10, 44, wrap)).toBe(0)
    expect(at(rows, 10, 46, wrap)).toBe(2)
    expect(at(rows, 10, -100, wrap)).toBe(0)
    expect(at(rows, 10, 900, wrap)).toBe(2)
  })

  it('row-reverse с переносом', () => {
    const rects = [r(150, 0), r(50, 0), r(150, 50)]
    const options = { wrap: true, direction: 'row-reverse' } as const
    expect(at(rects, 20, 20, options)).toBe(2)
    expect(at(rects, 240, 70, options)).toBe(2)
    expect(at(rects, 160, 70, options)).toBe(3)
  })

  it('column с переносом: линии — колонки по x', () => {
    const rects = [r(0, 0), r(0, 40), r(110, 0)]
    const options = { wrap: true, direction: 'column' } as const
    expect(at(rects, 120, 60, options)).toBe(3)
    expect(at(rects, 120, 5, options)).toBe(2)
    expect(at(rects, 10, 60, options)).toBe(2)
  })

  it('по одному ребёнку в линии — выбор по поперечной оси', () => {
    const rects = [r(0, 0), r(0, 50), r(0, 100)]
    expect(at(rects, 10, 10, wrap)).toBe(0)
    expect(at(rects, 60, 10, wrap)).toBe(1)
    expect(at(rects, 10, 60, wrap)).toBe(1)
    expect(at(rects, 60, 120, wrap)).toBe(3)
  })

  it('дробные замеры в пределах допуска — одна линия', () => {
    const rects = [r(0, 0, 100.4, 40), r(100.3, 0, 100, 40)]
    expect(at(rects, 190, 30, wrap)).toBe(2)
    expect(at(rects, 120, 30, wrap)).toBe(1)
  })

  it('ребёнок нулевой ширины между двумя остаётся в линии, его середина работает', () => {
    const rects = [r(0, 0), r(100, 0, 0, 40), r(100, 0)]
    expect(at(rects, 99, 20, wrap)).toBe(1)
    expect(at(rects, 100, 20, wrap)).toBe(2)
  })
})

describe('flexInsertIndex: пустые и не отрисованные дети', () => {
  it('пустой контейнер — 0', () => {
    expect(at([], 10, 10)).toBe(0)
  })

  it('все не замерены — в конец', () => {
    expect(at([null, null, null], 10, 10)).toBe(3)
  })

  it('не отрисованный ребёнок посередине пропускается, индексы остальных сохраняются', () => {
    const rects = [r(0, 0), null, r(100, 0)]
    expect(at(rects, 60, 20)).toBe(2)
    expect(at(rects, 160, 20)).toBe(3)
  })

  it('все прямоугольники нулевые: точка до них — 0, иначе — в конец', () => {
    const rects = [r(0, 0, 0, 0), r(0, 0, 0, 0), r(0, 0, 0, 0)]
    expect(at(rects, -1, 0)).toBe(0)
    expect(at(rects, 0, 0)).toBe(3)
    expect(at(rects, -1, 0, { wrap: true })).toBe(0)
  })
})

describe('flexInsertIndex: перетаскиваемый ребёнок', () => {
  const rects = [r(0, 0), r(100, 0), r(200, 0)]
  const skip = { skip: 1 }

  it('над собственным следом — «на место»: moveNode возвращает тот же документ', () => {
    expect(at(rects, 110, 20, skip)).toBe(2)
    expect(at(rects, 190, 20, skip)).toBe(2)
    const doc = makeDoc()
    expect(moveNode(doc, 'a2', { type: 'child', parentId: 'A', index: 2 })).toBe(doc)
    expect(moveNode(doc, 'a2', { type: 'child', parentId: 'A', index: 1 })).toBe(doc)
  })

  it('за серединами соседей — до первого и после последнего', () => {
    expect(at(rects, 10, 20, skip)).toBe(0)
    expect(at(rects, 260, 20, skip)).toBe(3)
  })

  it('единственный ребёнок — сам перетаскиваемый: from + 1', () => {
    expect(at([r(0, 0)], 10, 20, { skip: 0 })).toBe(1)
  })

  it('единственный в своей линии: его полоса делится между соседними линиями', () => {
    const lines = [r(0, 0), r(0, 50), r(0, 100)]
    expect(at(lines, 60, 55, { wrap: true, skip: 1 })).toBe(1)
    expect(at(lines, 10, 85, { wrap: true, skip: 1 })).toBe(2)
  })
})

describe('flexInsertIndex: вход', () => {
  it('не мутирует прямоугольники и точку', () => {
    const rects = deepFreeze([r(0, 0), r(100, 0), r(0, 50)])
    const pointer = deepFreeze({ x: 60, y: 20 })
    expect(flexInsertIndex({ direction: 'row-reverse', wrap: true, rects, pointer, skip: 0 })).toBeTypeOf('number')
  })
})
