/** Тесты генератора id: формат UUID и уникальность. */
import { describe, expect, it } from 'vitest'
import { createId } from '@/scripts/globals/id'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('createId', () => {
  it('возвращает UUID v4', () => {
    expect(createId()).toMatch(UUID_PATTERN)
  })

  it('не повторяется', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createId()))
    expect(ids.size).toBe(100)
  })
})
