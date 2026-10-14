/** Тесты ariaLabelUnlessLabelledBy: aria-label ставится, только если нет внешнего aria-labelledby. */
import { describe, expect, it } from 'vitest'
import { ariaLabelUnlessLabelledBy } from '@/scripts/globals/aria'

describe('ariaLabelUnlessLabelledBy', () => {
  it('без атрибутов и без aria-labelledby возвращает подпись', () => {
    expect(ariaLabelUnlessLabelledBy('Gap', undefined)).toBe('Gap')
    expect(ariaLabelUnlessLabelledBy('Gap', { id: 'x' })).toBe('Gap')
    expect(ariaLabelUnlessLabelledBy('Gap', { 'aria-labelledby': '' })).toBe('Gap')
  })

  it('с aria-labelledby подпись не нужна', () => {
    expect(ariaLabelUnlessLabelledBy('Gap', { 'aria-labelledby': 'label-1' })).toBeUndefined()
  })
})
