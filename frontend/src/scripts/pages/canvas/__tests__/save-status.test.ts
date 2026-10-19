/** Тесты чистой части статуса сохранения и демо-режима: подписи с учётом синхронизации, признак демо по URL, автосохранение. */
import { describe, expect, it } from 'vitest'
import { isAutosaveEnabled, isDemoRequested, saveStatusKind, saveStatusLabel } from '@/scripts/pages/canvas/save-status'

describe('saveStatusLabel', () => {
  it('демо, ошибка и идущее сохранение не зависят от синхронизации', () => {
    expect(saveStatusLabel('saving', 'synced')).toBe('Сохраняется…')
    expect(saveStatusLabel('error', 'synced')).toBe('Не удалось сохранить')
    expect(saveStatusLabel('demo', 'off')).toBe('Демо, не сохраняется')
  })

  it('сохранённое уточняется синхронизацией', () => {
    expect(saveStatusLabel('saved', 'synced')).toBe('Сохранено')
    expect(saveStatusLabel('saved', 'syncing')).toBe('Сохраняется…')
    expect(saveStatusLabel('saved', 'off')).toBe('Сохранено в браузере')
    expect(saveStatusLabel('saved', 'failed')).toBe('Нет связи с сервером')
  })

  it('вид статуса для точки в хедере', () => {
    expect(saveStatusKind('saved', 'off')).toBe('local')
    expect(saveStatusKind('saved', 'failed')).toBe('offline')
    expect(saveStatusKind('error', 'failed')).toBe('error')
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
