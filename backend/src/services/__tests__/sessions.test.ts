/** Тесты сервиса сессий: создание, проверка срока, удаление, хранение только хэша токена. */

import type { Database } from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { memoryDatabase } from '@/__tests__/fixtures'
import { createSession, deleteExpiredSessions, deleteSession, isSessionValid } from '@/services/sessions'

const NOW = new Date('2026-05-01T12:00:00.000Z')
const HOUR_MS = 60 * 60 * 1000

describe('сервис сессий', () => {
  let db: Database

  beforeEach(() => {
    db = memoryDatabase()
  })

  afterEach(() => {
    db.close()
  })

  it('сессия действительна до истечения срока и недействительна после', () => {
    const token = createSession(db, NOW, HOUR_MS)
    expect(isSessionValid(db, token, NOW)).toBe(true)
    expect(isSessionValid(db, token, new Date(NOW.getTime() + HOUR_MS))).toBe(false)
  })

  it('чужой токен недействителен', () => {
    createSession(db, NOW, HOUR_MS)
    expect(isSessionValid(db, 'подделка', NOW)).toBe(false)
  })

  it('в базе хранится не сам токен', () => {
    const token = createSession(db, NOW, HOUR_MS)
    const stored = db.prepare('SELECT token_hash FROM sessions').pluck().all()
    expect(stored).toHaveLength(1)
    expect(stored).not.toContain(token)
  })

  it('удаление сессии и истёкших сессий', () => {
    const kept = createSession(db, NOW, HOUR_MS * 2)
    const gone = createSession(db, NOW, HOUR_MS)
    deleteSession(db, kept)
    expect(isSessionValid(db, kept, NOW)).toBe(false)
    expect(deleteExpiredSessions(db, new Date(NOW.getTime() + HOUR_MS))).toBe(1)
    expect(isSessionValid(db, gone, NOW)).toBe(false)
  })
})
