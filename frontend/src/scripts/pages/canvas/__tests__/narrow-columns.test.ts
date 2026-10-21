/** Тесты narrow-columns: разбор и показ шагов «колонок на узких экранах», намерение для экспорта. */
import { describe, expect, it } from 'vitest'
import { createGridContainer } from '@/scripts/pages/canvas/factories'
import {
  formatNarrowColumns,
  narrowColumnsIntent,
  normalizeNarrowColumns,
  parseNarrowColumns,
} from '@/scripts/pages/canvas/narrow-columns'

describe('parseNarrowColumns', () => {
  it('принимает разные разделители и пустое поле', () => {
    expect(parseNarrowColumns('2 → 1')).toEqual([2, 1])
    expect(parseNarrowColumns('2,1')).toEqual([2, 1])
    expect(parseNarrowColumns('3 -> 2 > 1')).toEqual([3, 2, 1])
    expect(parseNarrowColumns('  ')).toEqual([])
  })

  it('отклоняет буквы, не убывающие шаги, ноль, больше 12 и больше 4 шагов', () => {
    expect(parseNarrowColumns('2 колонки')).toBeNull()
    expect(parseNarrowColumns('1 2')).toBeNull()
    expect(parseNarrowColumns('2 2')).toBeNull()
    expect(parseNarrowColumns('0')).toBeNull()
    expect(parseNarrowColumns('13')).toBeNull()
    expect(parseNarrowColumns('5 4 3 2 1')).toBeNull()
  })

  it('показ и нормализация: стрелками', () => {
    expect(formatNarrowColumns([2, 1])).toBe('2 → 1')
    expect(formatNarrowColumns(undefined)).toBe('')
    expect(normalizeNarrowColumns('2 1')).toBe('2 → 1')
    expect(normalizeNarrowColumns('x')).toBeNull()
  })
})

describe('narrowColumnsIntent', () => {
  const grid = { ...createGridContainer(), columns: 'repeat(4, 1fr)' }

  it('с текущим числом колонок впереди', () => {
    expect(narrowColumnsIntent({ ...grid, narrowColumns: [2, 1] })).toBe('колонки на узких экранах: 4 → 2 → 1')
  })

  it('число колонок неизвестно (auto-fill) или не больше первого шага — только шаги', () => {
    const auto = { ...grid, columns: 'repeat(auto-fill, minmax(200px, 1fr))', narrowColumns: [1] }
    expect(narrowColumnsIntent(auto)).toBe('колонки на узких экранах: 1')
    expect(narrowColumnsIntent({ ...grid, columns: '1fr 1fr', narrowColumns: [2, 1] })).toBe(
      'колонки на узких экранах: 2 → 1',
    )
  })

  it('без шагов — null', () => {
    expect(narrowColumnsIntent(grid)).toBeNull()
  })
})
