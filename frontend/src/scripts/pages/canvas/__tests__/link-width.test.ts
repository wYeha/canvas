/** Тесты ширин связи: строка «источник / место» и цель «Подогнать». */
import { describe, expect, it } from 'vitest'
import { linkWidthState } from '@/scripts/pages/canvas/link-width'

describe('linkWidthState', () => {
  it('разные ширины: строка и цель подгонки — место (округлённое)', () => {
    expect(linkWidthState(480, 455.6)).toEqual({ text: 'источник: 480px / место: 456px', fitTo: 456 })
  })

  it('совпадают — подгонять нечего', () => {
    expect(linkWidthState(456, 456.2).fitTo).toBeNull()
  })

  it('место не замерено — прочерк, подгонять некуда', () => {
    expect(linkWidthState(480, null)).toEqual({ text: 'источник: 480px / место: —', fitTo: null })
    expect(linkWidthState(480, 0).fitTo).toBeNull()
  })
})
