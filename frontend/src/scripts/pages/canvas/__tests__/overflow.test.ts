/** Тесты overflow: оси обрезки (фикс. с числом, корень с высотой превью, ось прокрутки не режется), подсчёт и бейдж. */
import { describe, expect, it } from 'vitest'
import { createBlock } from '@/scripts/pages/canvas/factories'
import { clipAxes, measureOverflow, overflowBadgeText } from '@/scripts/pages/canvas/overflow'

/** Блок с ребёнком и полями `self`/контейнера. */
function parent(self = {}, scroll?: 'x' | 'y') {
  const base = createBlock('flex', 'p')
  const container = scroll === undefined ? base.container : { ...base.container, scroll }
  return { ...base, self, container, children: [createBlock('flex', 'c')] }
}

describe('clipAxes', () => {
  it('режет только оси «Фикс.» с числом и только с детьми', () => {
    expect(clipAxes(parent({ heightMode: 'fixed', height: '80px' }), 'flex', false)).toEqual({ x: false, y: true })
    expect(clipAxes(parent({ widthMode: 'fixed' }), 'flex', false)).toEqual({ x: false, y: false })
    expect(clipAxes(parent({ width: '200px' }), 'grid', false)).toEqual({ x: true, y: false })
    expect(clipAxes({ ...parent({ height: '80px' }), children: [] }, 'flex', false)).toEqual({ x: false, y: false })
  })

  it('ось прокрутки не режется — она прокручивается', () => {
    expect(clipAxes(parent({ height: '80px' }, 'y'), 'flex', false)).toEqual({ x: false, y: false })
  })

  it('корень — по высоте, только с фиксированной высотой превью', () => {
    expect(clipAxes(parent({ height: '80px' }), null, false)).toEqual({ x: false, y: false })
    expect(clipAxes(parent(), null, true)).toEqual({ x: false, y: true })
    expect(clipAxes(parent({}, 'y'), null, true)).toEqual({ x: false, y: false })
  })
})

describe('measureOverflow', () => {
  const box = { width: 200, height: 100 }
  /** Ребёнок 100×40 с верхом `top` и левым краем `left`. */
  function child(top: number, left = 0) {
    return { left, top, width: 100, height: 40 }
  }

  it('считает детей, вылезающих по осям обрезки; по высоте важнее', () => {
    expect(measureOverflow(box, [child(20), child(64), child(110)], { x: false, y: true })).toEqual({
      count: 2,
      axis: 'y',
    })
    expect(measureOverflow(box, [child(20, 150)], { x: true, y: false })).toEqual({ count: 1, axis: 'x' })
    expect(measureOverflow(box, [child(70, 150)], { x: true, y: true })).toEqual({ count: 1, axis: 'y' })
  })

  it('всё помещается (с допуском на дробные пиксели) — null', () => {
    expect(measureOverflow(box, [child(60.3)], { x: false, y: true })).toBeNull()
    expect(measureOverflow(box, [child(80)], { x: true, y: false })).toBeNull()
  })

  it('текст бейджа', () => {
    expect(overflowBadgeText({ count: 3, axis: 'y' })).toBe('+3 скрыто ↓')
    expect(overflowBadgeText({ count: 1, axis: 'x' })).toBe('+1 скрыто →')
  })
})
