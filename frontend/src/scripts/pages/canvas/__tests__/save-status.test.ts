/** Тесты чистой части статуса сохранения и демо-режима: подписи, признак демо по URL, автосохранение. */
import { describe, expect, it } from 'vitest'
import { isAutosaveEnabled, isDemoRequested, saveStatusLabel } from '@/scripts/pages/canvas/save-status'

describe('saveStatusLabel', () => {
  it('подписи всех статусов', () => {
    expect(saveStatusLabel('saved')).toBe('Сохранено')
    expect(saveStatusLabel('saving')).toBe('Сохраняется…')
    expect(saveStatusLabel('error')).toBe('Не удалось сохранить')
    expect(saveStatusLabel('demo')).toBe('Демо, не сохраняется')
  })
})

describe('isDemoRequested', () => {
  it('в dev с ?demo — демо', () => {
    expect(isDemoRequested('?demo', true)).toBe(true)
    expect(isDemoRequested('?a=1&demo=1', true)).toBe(true)
  })

  it('без параметра — не демо', () => {
    expect(isDemoRequested('', true)).toBe(false)
    expect(isDemoRequested('?other', true)).toBe(false)
  })

  it('в production демо недоступно даже с ?demo', () => {
    expect(isDemoRequested('?demo', false)).toBe(false)
  })
})

describe('isAutosaveEnabled', () => {
  it('демо не сохраняется, остальные статусы — да', () => {
    expect(isAutosaveEnabled('demo')).toBe(false)
    expect(isAutosaveEnabled('saved')).toBe(true)
    expect(isAutosaveEnabled('saving')).toBe(true)
    expect(isAutosaveEnabled('error')).toBe(true)
  })
})
