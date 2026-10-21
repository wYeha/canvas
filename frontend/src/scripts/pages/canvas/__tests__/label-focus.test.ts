/** Тесты label-focus: набор блоков, чьи чипы видны на мелком масштабе, и порог мелкого масштаба. */
import { describe, expect, it } from 'vitest'
import { isSmallZoom, labelFocusIds } from '@/scripts/pages/canvas/label-focus'
import { makeDoc } from './tree-fixture'

describe('labelFocusIds', () => {
  it('цепочки от корня до выделенного и до наведённого', () => {
    expect([...labelFocusIds(makeDoc(), 'a1x', 'a2')].sort()).toEqual(['A', 'a1', 'a1x', 'a2'])
  })

  it('без выделения и наведения — пусто; несуществующий id не мешает', () => {
    expect(labelFocusIds(makeDoc(), null, null).size).toBe(0)
    expect([...labelFocusIds(makeDoc(), 'nope', 'a3')]).toEqual(['A', 'a3'])
  })
})

describe('isSmallZoom', () => {
  it('ниже 90% — мелкий масштаб', () => {
    expect(isSmallZoom(0.5)).toBe(true)
    expect(isSmallZoom(0.9)).toBe(false)
    expect(isSmallZoom(2)).toBe(false)
  })
})
