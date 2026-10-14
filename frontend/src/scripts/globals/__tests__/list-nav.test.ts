/** Тесты навигации по спискам: соседние доступные пункты, края, круг и поиск по первой букве. */
import { describe, expect, it } from 'vitest'
import { findEnabledIndex, firstEnabledIndex, lastEnabledIndex, typeaheadIndex } from '@/scripts/globals/list-nav'

const ITEMS = [{}, { disabled: true }, {}, {}]

describe('findEnabledIndex', () => {
  it('пропускает недоступные пункты', () => {
    expect(findEnabledIndex(ITEMS, 0, 1, false)).toBe(2)
    expect(findEnabledIndex(ITEMS, 2, -1, false)).toBe(0)
  })

  it('без wrap упирается в край, с wrap идёт по кругу', () => {
    expect(findEnabledIndex(ITEMS, 3, 1, false)).toBe(-1)
    expect(findEnabledIndex(ITEMS, 3, 1, true)).toBe(0)
    expect(findEnabledIndex(ITEMS, 0, -1, true)).toBe(3)
  })

  it('пустой список и список без доступных дают -1', () => {
    expect(findEnabledIndex([], 0, 1, true)).toBe(-1)
    expect(findEnabledIndex([{ disabled: true }], -1, 1, true)).toBe(-1)
  })
})

describe('firstEnabledIndex и lastEnabledIndex', () => {
  it('находят края среди доступных', () => {
    expect(firstEnabledIndex([{ disabled: true }, {}, {}])).toBe(1)
    expect(lastEnabledIndex([{}, {}, { disabled: true }])).toBe(1)
    expect(lastEnabledIndex([])).toBe(-1)
  })
})

describe('typeaheadIndex', () => {
  const labels = [{ label: 'div' }, { label: 'section' }, { label: 'main', disabled: true }, { label: 'nav' }]

  it('находит следующий пункт на букву, регистр не важен', () => {
    expect(typeaheadIndex(labels, 0, 'S')).toBe(1)
    expect(typeaheadIndex(labels, 0, 'n')).toBe(3)
  })

  it('идёт по кругу и пропускает недоступные', () => {
    expect(typeaheadIndex(labels, 3, 'd')).toBe(0)
    expect(typeaheadIndex(labels, 0, 'm')).toBe(-1)
  })
})
