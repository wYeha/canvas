/** Тесты настроек редактора: разбор и запись флага подписей. */
import { describe, expect, it } from 'vitest'
import { parseLabelsVisible, serializeFlag } from '@/scripts/pages/canvas/view-settings'

describe('parseLabelsVisible', () => {
  it('по умолчанию и на мусоре подписи показаны', () => {
    expect(parseLabelsVisible(null)).toBe(true)
    expect(parseLabelsVisible('что-то')).toBe(true)
    expect(parseLabelsVisible('true')).toBe(true)
  })

  it('скрыты только при явном false', () => {
    expect(parseLabelsVisible('false')).toBe(false)
  })

  it('serialize и parse обратимы', () => {
    expect(parseLabelsVisible(serializeFlag(false))).toBe(false)
    expect(parseLabelsVisible(serializeFlag(true))).toBe(true)
  })
})
